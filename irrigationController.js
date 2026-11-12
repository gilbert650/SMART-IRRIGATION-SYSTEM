const { pool } = require('../config/db');
const { success, error } = require('../utils/response');
const irrigationService = require('../services/irrigationService');

async function getMode(req, res, next) {
  try {
    const deviceId = req.query.device_id || 1;
    const state = await irrigationService.getSystemState(deviceId);
    if (!state) return error(res, 'NOT_FOUND', 'System state not found', 404);
    return success(res, { irrigation_mode: state.irrigation_mode, device_id: deviceId });
  } catch (err) {
    next(err);
  }
}

async function setMode(req, res, next) {
  try {
    const { device_id, mode } = req.body;
    if (!device_id || !mode) {
      return error(res, 'VALIDATION_ERROR', 'device_id and mode required', 422);
    }
    const result = await irrigationService.setMode(device_id, mode);
    return success(res, result, 'Irrigation mode updated');
  } catch (err) {
    next(err);
  }
}

async function listEvents(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const deviceId = req.query.device_id;
    const mode = req.query.mode;
    const source = req.query.source;
    const from = req.query.from;
    const to = req.query.to;

    let where = '1=1';
    const params = [];
    if (deviceId) {
      where += ' AND e.device_id = ?';
      params.push(deviceId);
    }
    if (mode === 'AUTO' || mode === 'MANUAL') {
      where += ' AND e.mode = ?';
      params.push(mode);
    }
    if (source === 'SIMULATION' || source === 'HARDWARE') {
      where += ' AND e.source = ?';
      params.push(source);
    }
    if (from) {
      where += ' AND e.created_at >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND e.created_at <= ?';
      params.push(to);
    }

    const [rows] = await pool.query(
      `SELECT e.*, d.device_code, d.device_name
       FROM irrigation_events e
       JOIN devices d ON d.id = e.device_id
       WHERE ${where}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM irrigation_events e WHERE ${where}`,
      params
    );

    return success(res, {
      data: rows,
      pagination: { page, limit, total: countRows[0].total }
    });
  } catch (err) {
    next(err);
  }
}

async function getEvent(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, d.device_code FROM irrigation_events e
       JOIN devices d ON d.id = e.device_id WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'NOT_FOUND', 'Event not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMode, setMode, listEvents, getEvent };
