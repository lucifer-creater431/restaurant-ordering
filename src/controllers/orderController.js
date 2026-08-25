const pool = require('../config/db');
const { sendWhatsAppNotification } = require('../sevices/notificationService');

// Fetch all orders
exports.getAllOrders = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Fetch Orders Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  const { customer_phone, delivery_address, items, total_amount } = req.body;

  try {
    const calculatedTotal = total_amount || 450.00; // Default amount if missing

    const result = await pool.query(
      `INSERT INTO orders (customer_phone, delivery_address, total_amount, status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [customer_phone || 'N/A', delivery_address || 'N/A', calculatedTotal, 'pending']
    );

    const newOrder = result.rows[0];

    // WhatsApp Notification Trigger (Twilio Sandbox)
    if (customer_phone) {
      const message = `🍔 Order Confirmed!\nYour Order #${newOrder.id} has been placed successfully.\nTotal: RS ${calculatedTotal}\nStatus: Pending`;
      sendWhatsAppNotification(customer_phone, message).catch(err => console.error('WhatsApp Error:', err));
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error('Create Order Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error('Update Status Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
// Change 'services' to 'sevices' (jo image mein aapka folder name hai)
const { sendWhatsAppNotification } = require('../sevices/notificationService');
// Check line 2: 'services' nahi, 'sevices' hona chahiye
const { sendWhatsAppNotification } = require('../sevices/notificationService');