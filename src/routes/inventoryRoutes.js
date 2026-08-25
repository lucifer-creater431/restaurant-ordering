const express = require('express');
const { getInventoryByRestaurant } = require('../controllers/inventoryController');

const router = express.Router();

router.get('/:restaurantId', getInventoryByRestaurant);

module.exports = router;
