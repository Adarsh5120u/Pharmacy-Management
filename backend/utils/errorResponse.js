function sendServerError(res, err, context) {
  if (context) {
    console.error(context, err);
  } else {
    console.error(err);
  }

  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
  });
}

module.exports = { sendServerError };
