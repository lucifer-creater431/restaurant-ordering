const pool = require('../config/db');

/**
 * GET /api/inventory/:restaurantId
 * Fetch real-time menu item availability for a restaurant.
 */
async function getInventoryByRestaurant(req, res, next) {
  try {
    const { restaurantId } = req.params;

    const restaurantCheck = await pool.query(
      'SELECT id, name FROM restaurants WHERE id = $1',
      [restaurantId]
    );

    if (restaurantCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Restaurant ${restaurantId} not found`,
      });
    }

    const result = await pool.query(
      `SELECT
         mi.id          AS menu_item_id,
         mi.name,
         mi.description,
         mi.price,
         mi.category,
         mi.is_available,
         i.quantity     AS stock_quantity,
         i.low_stock_threshold,
         CASE
           WHEN i.quantity = 0 THEN 'out_of_stock'
           WHEN i.quantity <= i.low_stock_threshold THEN 'low_stock'
           ELSE 'in_stock'
         END            AS stock_status,
         i.updated_at   AS stock_updated_at
       FROM menu_items mi
       JOIN inventory i ON i.menu_item_id = mi.id
       WHERE mi.restaurant_id = $1
       ORDER BY mi.category, mi.name`,
      [restaurantId]
    );

    res.json({
      success: true,
      restaurant: restaurantCheck.rows[0],
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getInventoryByRestaurant };
