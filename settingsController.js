const { pool } = require('../config/db');
const { success, error } = require('../utils/response');

async function list(req, res, next) {
  try {
    const deviceId = req.query.device_id;
    let sql = `SELECT s.*, d.device_code, d.device_name FROM irrigation_settings s
               JOIN devices d ON d.id = s.device_id`;
    const params = [];
    if (deviceId) {
      sql += ' WHERE s.device_id = ?';
      params.push(deviceId);
    }
    const [rows] = await pool.query(sql, params);
    return success(res, deviceId ? rows[0] || null : rows);
  } catch (err) {
    next(err);
  }
}

async function getByDevice(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, d.device_code FROM irrigation_settings s
       JOIN devices d ON d.id = s.device_id WHERE s.device_id = ?`,
      [req.params.deviceId]
    );
    if (!rows.length) return error(res, 'NOT_FOUND', 'Settings not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const deviceId = req.params.deviceId || req.body.device_id;
    if (!deviceId) {
      return error(res, 'VALIDATION_ERROR', 'device_id is required', 422);
    }

    const {
      start_moisture_threshold,
      stop_moisture_threshold,
      maximum_runtime_seconds,
      cooldown_seconds,
      stale_reading_timeout_seconds,
      simulation_interval_ms,
      min_tank_level_percent
    } = req.body;

    const start =
      start_moisture_threshold !== undefined ? Number(start_moisture_threshold) : null;
    const stop = stop_moisture_threshold !== undefined ? Number(stop_moisture_threshold) : null;

    if (start !== null && (Number.isNaN(start) || start < 0 || start > 100)) {
      return error(res, 'VALIDATION_ERROR', 'start_moisture_threshold must be 0-100', 422);
    }
    if (stop !== null && (Number.isNaN(stop) || stop < 0 || stop > 100)) {
      return error(res, 'VALIDATION_ERROR', 'stop_moisture_threshold must be 0-100', 422);
    }

    const [current] = await pool.query(
      `SELECT * FROM irrigation_settings WHERE device_id = ?`,
      [deviceId]
    );
    if (!current.length) {
      return error(res, 'NOT_FOUND', 'Settings not found for device', 404);
    }
    const finalStart = start !== null ? start : Number(current[0].start_moisture_threshold);
    const finalStop = stop !== null ? stop : Number(current[0].stop_moisture_threshold);
    if (finalStop <= finalStart) {
      return error(
        res,
        'VALIDATION_ERROR',
        'stop_moisture_threshold must be higher than start_moisture_threshold (hysteresis)',
        422
      );
    }

    await pool.query(
      `UPDATE irrigation_settings SET
         start_moisture_threshold = COALESCE(?, start_moisture_threshold),
         stop_moisture_threshold = COALESCE(?, stop_moisture_threshold),
         maximum_runtime_seconds = COALESCE(?, maximum_runtime_seconds),
         cooldown_seconds = COALESCE(?, cooldown_seconds),
         stale_reading_timeout_seconds = COALESCE(?, stale_reading_timeout_seconds),
         simulation_interval_ms = COALESCE(?, simulation_interval_ms),
         min_tank_level_percent = COALESCE(?, min_tank_level_percent),
         updated_at = NOW()
       WHERE device_id = ?`,
      [
        start,
        stop,
        maximum_runtime_seconds ?? null,
        cooldown_seconds ?? null,
        stale_reading_timeout_seconds ?? null,
        simulation_interval_ms ?? null,
        min_tank_level_percent ?? null,
        deviceId
      ]
    );

    const [updated] = await pool.query(
      `SELECT * FROM irrigation_settings WHERE device_id = ?`,
      [deviceId]
    );
    return success(res, updated[0], 'Settings updated');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getByDevice, update };
