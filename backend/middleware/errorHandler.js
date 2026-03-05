function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
}

module.exports = {
  errorHandler,
};
