const pool = require('../config/db');

async function findOrCreateCustomerByPhone(client, phone) {
  const existing = await client.query(
    "SELECT id FROM users WHERE phone = $1 AND role = 'customer' LIMIT 1",
    [phone]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const sanitized = phone.replace(/\D/g, '');
  const email = `whatsapp_${sanitized}@orders.local`;

  const created = await client.query(
    "INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, 'customer', $4) RETURNING id",
    [`WhatsApp Customer ${sanitized}`, email, 'WEBHOOK_GUEST_NO_LOGIN', phone]
  );

  return created.rows[0].id;
}

async function handleWebhookOrder(req, res) {
  let client;
  try {
    const { customer_phone, delivery_address, items, restaurantId, notes } = req.body;

    if (!customer_phone || !delivery_address || !items?.length) {
      return res.status(400).json({
        success: false,
        message: 'customer_phone, delivery_address, and items are required',
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const customerId = await findOrCreateCustomerByPhone(client, customer_phone);

    let totalAmount = 0;
    const resolvedItems = [];
    let resolvedRestaurantId = restaurantId || null;

    for (const item of items) {
      let menuItemId = item.menuItemId;
      let quantity = item.quantity || 1;

      if (typeof item === 'string') {
        const match = item.match(/\d+/);
        if (match) quantity = parseInt(match[0], 10);

        const itemNameClean = item.replace(/\d+/g, '').trim();
        const searchRes = await client.query(
          "SELECT id FROM menu_items WHERE LOWER(name) LIKE LOWER($1) LIMIT 1",
          [`%${itemNameClean}%`]
        );

        if (searchRes.rows.length > 0) {
          menuItemId = searchRes.rows[0].id;
        } else {
          const defaultItem = await client.query("SELECT id FROM menu_items LIMIT 1");
          if (defaultItem.rows.length === 0) throw new Error('No menu items available in system');
          menuItemId = defaultItem.rows[0].id;
        }
      }

      const parsedMenuItemId = parseInt(menuItemId, 10);
      const parsedQuantity = parseInt(quantity, 10);

      const menuResult = await client.query(
        'SELECT * FROM menu_items WHERE id = $1',
        [parsedMenuItemId]
      );

      if (menuResult.rows.length === 0) {
        throw new Error(`Menu item ${parsedMenuItemId} not found`);
      }

      const menuItem = menuResult.rows[0];

      const inventoryResult = await client.query(
        'SELECT quantity FROM inventory WHERE menu_item_id = $1',
        [parsedMenuItemId]
      );

      if (inventoryResult.rows.length === 0) {
        throw new Error(`Inventory record not found for menu item ${parsedMenuItemId}`);
      }

      const stock = inventoryResult.rows[0].quantity;

      if (!resolvedRestaurantId) {
        resolvedRestaurantId = menuItem.restaurant_id;
      }

      if (!menuItem.is_available) {
        throw new Error(`"${menuItem.name}" is currently unavailable`);
      }

      if (stock < parsedQuantity) {
        throw new Error(`Insufficient stock for "${menuItem.name}". Available: ${stock}`);
      }

      const subtotal = parseFloat(menuItem.price) * parsedQuantity;
      totalAmount += subtotal;

      resolvedItems.push({
        menuItemId: parsedMenuItemId,
        quantity: parsedQuantity,
        unitPrice: parseFloat(menuItem.price),
        subtotal,
      });
    }

    const orderResult = await client.query(
      "INSERT INTO orders (customer_id, restaurant_id, total_amount, delivery_address, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [customerId, resolvedRestaurantId, totalAmount, delivery_address, notes || null]
    );

    const order = orderResult.rows[0];
    const orderItems = [];

    for (const item of resolvedItems) {
      await client.query(
        "UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE menu_item_id = $2",
        [item.quantity, item.menuItemId]
      );

      const itemResult = await client.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [order.id, item.menuItemId, item.quantity, item.unitPrice, item.subtotal]
      );

      orderItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Order created via webhook',
      data: {
        orderId: order.id,
        customerId,
        customerPhone: customer_phone,
        restaurantId: resolvedRestaurantId,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        items: orderItems,
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_rollbackError) {}
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = { handleWebhookOrder };