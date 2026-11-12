const { testConnection } = require('../config/db');
const { success, error } = require('../utils/response');
const simulator = require('../simulation/simulator');

async function health(req, res) {
  return success(res, {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    simulation: simulator.isRunning()
  }, 'API is operational');
}

async function databaseHealth(req, res) {
  const result = await testConnection();
  if (result.ok) {
    return success(res, { database: 'UP' }, result.message);
  }
  return error(res, 'DATABASE_UNAVAILABLE', result.message, 503, result.error);
}

async function systemStatus(req, res) {
  const db = await testConnection();
  const sim = simulator.getStatus();
  return success(res, {
    api: 'UP',
    database: db.ok ? 'UP' : 'DOWN',
    databaseError: db.ok ? null : db.error,
    simulation: sim,
    timestamp: new Date().toISOString()
  });
}

module.exports = { health, databaseHealth, systemStatus };
