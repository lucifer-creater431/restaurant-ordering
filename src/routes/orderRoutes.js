const express = require('express');
const router = express.Router();
const pool = require('../db'); // Apne pg pool path ke mutabiq adjust karein

// 1. GET /api/orders - Frontend Order List
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/orders - Voice Agent / ElevenLabs Order Create
router.post('/', async (req, res) => {
  const { customer_phone, delivery_address, items, total_amount } = req.body;
  
  // Default amount handling
  const calculatedTotal = total_amount || 450.00; 

  try {
    const newOrder = await pool.query(
      'INSERT INTO orders (customer_phone, delivery_address, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [customer_phone || 'N/A', delivery_address || 'N/A', calculatedTotal, 'pending']
    );

    res.status(201).json({ success: true, order: newOrder.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PATCH /api/orders/:id - Status Update (Confirm/Deliver)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedOrder = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json({ success: true, order: updatedOrder.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;