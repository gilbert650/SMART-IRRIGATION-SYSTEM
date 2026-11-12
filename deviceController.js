const { pool } = require('../config/db');
const { success, error } = require('../utils/response');

async function list(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, device_code, device_name, location, device_type, operating_mode,
              connection_status, last_seen, created_at, updated_at
       FROM devices ORDER BY id`
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query(`SELECT * FROM devices WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return error(res, 'NOT_FOUND', 'Device not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { device_code, device_name, location, device_type, operating_mode } = req.body;
    if (!device_code || !device_name) {
      return error(res, 'VALIDATION_ERROR', 'device_code and device_name are required', 422);
    }
    const [result] = await pool.query(
      `INSERT INTO devices (device_code, device_name, location, device_type, operating_mode)
       VALUES (?, ?, ?, ?, ?)`,
      [
        device_code,
        device_name,
        location || null,
        device_type || 'ESP32_IRRIGATION',
        operating_mode === 'HARDWARE' ? 'HARDWARE' : 'SIMULATION'
      ]
    );
    await pool.query(`INSERT INTO irrigation_settings (device_id) VALUES (?)`, [result.insertId]);
    await pool.query(`INSERT INTO system_state (device_id) VALUES (?)`, [result.insertId]);
    return success(res, { id: result.insertId, device_code, device_name }, 'Device created', 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { device_name, location, operating_mode } = req.body;
    const [result] = await pool.query(
      `UPDATE devices SET
         device_name = COALESCE(?, device_name),
         location = COALESCE(?, location),
         operating_mode = COALESCE(?, operating_mode),
         updated_at = NOW()
       WHERE id = ?`,
      [device_name ?? null, location ?? null, operating_mode ?? null, req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'NOT_FOUND', 'Device not found', 404);
    return success(res, null, 'Device updated');
  } catch (err) {
    next(err);
  }
}

async function status(req, res, next) {
  try {
    const [devices] = await pool.query(`SELECT * FROM devices WHERE id = ?`, [req.params.id]);
    if (!devices.length) return error(res, 'NOT_FOUND', 'Device not found', 404);
    const [state] = await pool.query(`SELECT * FROM system_state WHERE device_id = ?`, [req.params.id]);
    return success(res, { device: devices[0], system_state: state[0] || null });
  } catch (err) {
    next(err);
  }
}

async function heartbeat(req, res, next) {
  try {
    const [result] = await pool.query(
      `UPDATE devices SET connection_status = 'ONLINE', last_seen = NOW(), updated_at = NOW()
       WHERE id = ? OR device_code = ?`,
      [req.params.id, req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'NOT_FOUND', 'Device not found', 404);
    return success(res, { last_seen: new Date().toISOString() }, 'Heartbeat recorded');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, status, heartbeat };
