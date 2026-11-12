const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

/**
 * Protect routes that require a logged-in user.
 * Expects Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return error(res, 'UNAUTHORIZED', 'Authentication required', 401);
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET || 'dev-secret-change-me');
    req.user = payload;
    next();
  } catch (err) {
    return error(res, 'INVALID_TOKEN', 'Invalid or expired token', 401);
  }
}

/**
 * Optional role check. Call after requireAuth.
 * @param {...string} roles - allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, 'FORBIDDEN', 'You do not have permission for this action', 403);
    }
    next();
  };
}

/**
 * Device authentication via X-Device-Key header or Authorization Bearer for devices.
 */
function requireDeviceKey(req, res, next) {
  const key =
    req.headers['x-device-key'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!key || key !== process.env.DEVICE_API_KEY) {
    return error(res, 'DEVICE_UNAUTHORIZED', 'Invalid or missing device API key', 401);
  }
  next();
}

module.exports = { requireAuth, requireRole, requireDeviceKey };
