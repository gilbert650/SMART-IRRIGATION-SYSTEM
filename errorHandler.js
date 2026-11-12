const { error } = require('../utils/response');

/**
 * Centralized error handler.
 * Place as last middleware in app.js
 */
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message || err);

  if (err.name === 'ValidationError' || err.type === 'validation') {
    return error(res, 'VALIDATION_ERROR', err.message || 'Invalid input', 422, err.errors);
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return error(res, 'DUPLICATE_ENTRY', 'A record with this value already exists', 409);
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return error(res, 'DATABASE_UNAVAILABLE', 'The database is currently unavailable.', 503);
  }

  if (err.name === 'JsonWebTokenError') {
    return error(res, 'INVALID_TOKEN', 'Invalid or expired authentication token', 401);
  }

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error';

  return error(res, code, message, status);
}

module.exports = errorHandler;
