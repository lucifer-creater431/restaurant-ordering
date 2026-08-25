function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist (foreign key violation)',
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record (unique constraint violation)',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
