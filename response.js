/**
 * Consistent JSON response helpers
 */

function success(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data
  });
}

function error(res, code, message, status = 400, details = null) {
  const body = {
    success: false,
    error: {
      code,
      message
    }
  };
  if (details && process.env.NODE_ENV !== 'production') {
    body.error.details = details;
  }
  return res.status(status).json(body);
}

module.exports = { success, error };
