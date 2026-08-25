const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('DATABASE EXECUTION ERROR:', error);
    return res.status(500).json({
      success: false,
      message: String(error.message || error)
    });
  }
});

module.exports = router;