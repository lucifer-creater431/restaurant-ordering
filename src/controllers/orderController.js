const { sendOrderConfirmation } = require('../services/notificationService');

// App ke order creation function ke andar (jahan DB INSERT success hota hai):
// Example:
// const newOrder = await pool.query('INSERT INTO orders ...');

// Order insert hote hi notification trigger karein:
sendOrderConfirmation(customerPhone, newOrderId, totalAmount);


const pool = require('../config/db');

const VALID_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

/**
 * POST /api/orders
 * Place a new order — checks inventory, deducts stock, creates order + items.
 *
 * Body: {
 *   customerId, restaurantId, deliveryAddress, notes?,
 *   items: [{ menuItemId, quantity }]
 * }
 */
async function placeOrder(req, res, next) {
  const client = await pool.connect();

  try {
    const { customerId, restaurantId, deliveryAddress, notes, items } = req.body;

    if (!customerId || !restaurantId || !deliveryAddress || !items?.length) {
      return res.status(400).json({
        success: false,
        message: 'customerId, restaurantId, deliveryAddress, and items are required',
      });
    }

    await client.query('BEGIN');

    let totalAmount = 0;
    const resolvedItems = [];

    for (const item of items) {
      const { menuItemId, quantity } = item;

      if (!menuItemId || !quantity || quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid menuItemId and quantity > 0',
        });
      }

      const menuResult = await client.query(
        `SELECT mi.id, mi.name, mi.price, mi.is_available, i.quantity AS stock
         FROM menu_items mi
         JOIN inventory i ON i.menu_item_id = mi.id
         WHERE mi.id = $1 AND mi.restaurant_id = $2`,
        [menuItemId, restaurantId]
      );

      if (menuResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Menu item ${menuItemId} not found for this restaurant`,
        });
      }

      const menuItem = menuResult.rows[0];

      if (!menuItem.is_available) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `"${menuItem.name}" is currently unavailable`,
        });
      }

      if (menuItem.stock < quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `Insufficient stock for "${menuItem.name}". Available: ${menuItem.stock}, Requested: ${quantity}`,
        });
      }

      const subtotal = parseFloat(menuItem.price) * quantity;
      totalAmount += subtotal;

      resolvedItems.push({
        menuItemId,
        quantity,
        unitPrice: parseFloat(menuItem.price),
        subtotal,
      });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, restaurant_id, total_amount, delivery_address, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [customerId, restaurantId, totalAmount, deliveryAddress, notes || null]
    );

    const order = orderResult.rows[0];
    const orderItems = [];

    for (const item of resolvedItems) {
      await client.query(
        `UPDATE inventory
         SET quantity = quantity - $1, updated_at = NOW()
         WHERE menu_item_id = $2`,
        [item.quantity, item.menuItemId]
      );

      const itemResult = await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [order.id, item.menuItemId, item.quantity, item.unitPrice, item.subtotal]
      );

      orderItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { ...order, items: orderItems },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/orders/:id/status
 * Update order/delivery status.
 *
 * Body: { status, riderId? }
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, riderId } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const fields = ['status = $1', 'updated_at = NOW()'];
    const values = [status];
    let paramIndex = 2;

    if (riderId !== undefined) {
      fields.push(`rider_id = $${paramIndex}`);
      values.push(riderId);
      paramIndex++;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Order ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { placeOrder, updateOrderStatus };

// Order Creation Controller Logic
exports.createOrder = async (req, res) => {
  const { items, customer_phone, delivery_address } = req.body;

  try {
    for (let item of items) {
      // 1. Check if item exists in Menu
      const result = await pool.query(
        'SELECT id, name, stock_quantity FROM menu_items WHERE LOWER(name) = LOWER($1)',
        [item.name]
      );

      if (result.rows.length === 0) {
        // Dynamic Response for ElevenLabs / n8n AI Voice Agent
        return res.status(400).json({
          success: false,
          speech_response: `Aapka chaha hua item '${item.name}' hamare menu par available nahi hai. Kya aap kuch aur order karna chahenge?`
        });
      }

      const menuItem = result.rows[0];

      // 2. Check Stock Availability
      if (menuItem.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          speech_response: `Maazrat, '${menuItem.name}' filhal stock mein khatam ho chuka hai. Kya main aapke liye koi doosra burger add kar doon?`
        });
      }
    }

    // Success flow: DB Insert & Send Twilio Confirmation
    // ...

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, speech_response: 'Server error processing your order.' });
  }
};