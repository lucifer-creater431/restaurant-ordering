const express = require('express');
const { handleWebhookOrder } = require('../controllers/webhookController');

const router = express.Router();

router.post('/order', handleWebhookOrder);

module.exports = router;
