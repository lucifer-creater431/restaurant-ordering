const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// GET /api/orders - Fetch all orders
router.get('/', orderController.getAllOrders);

// POST /api/orders - Create new order (from curl or ElevenLabs)
router.post('/', orderController.createOrder);

// PATCH /api/orders/:id - Update status (confirmed / delivered)
router.patch('/:id', orderController.updateOrderStatus);

module.exports = router;