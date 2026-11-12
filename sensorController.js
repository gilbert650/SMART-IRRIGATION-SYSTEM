const { pool } = require('../config/db');
const { success, error } = require('../utils/response');

async function latest(req, res, next) {
  try {
    const deviceId = req.query.device_id;
    let sql = `
      SELECT r.*, d.device_code, d.device_name, d.connection_status
      FROM sensor_readings r
      JOIN devices d ON d.id = r.device_id
    `;
    const params = [];
    if (deviceId) {
      sql += ' WHERE r.device_id = ?';
      params.push(deviceId);
    }
    sql += ' ORDER BY r.created_at DESC LIMIT 1';
    const [rows] = await pool.query(sql, params);
    if (!rows.length) {
      return success(res, null, 'No readings yet');
    }
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const deviceId = req.query.device_id;
    const from = req.query.from;
    const to = req.query.to;
    const source = req.query.source;

    let where = '1=1';
    const params = [];
    if (deviceId) {
      where += ' AND r.device_id = ?';
      params.push(deviceId);
    }
    if (from) {
      where += ' AND r.created_at >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND r.created_at <= ?';
      params.push(to);
    }
    if (source === 'SIMULATION' || source === 'HARDWARE') {
      where += ' AND r.source = ?';
      params.push(source);
    }

    const [rows] = await pool.query(
      `SELECT r.*, d.device_code
       FROM sensor_readings r
       JOIN devices d ON d.id = r.device_id
       WHERE ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM sensor_readings r WHERE ${where}`,
      params
    );

    return success(res, {
      data: rows,
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
}

async function latestByDevice(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, d.device_code, d.device_name
       FROM sensor_readings r
       JOIN devices d ON d.id = r.device_id
       WHERE r.device_id = ?
       ORDER BY r.created_at DESC LIMIT 1`,
      [req.params.deviceId]
    );
    if (!rows.length) return success(res, null, 'No readings for this device');
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function historyByDevice(req, res, next) {
  req.query.device_id = req.params.deviceId;
  return history(req, res, next);
}

/**
 * POST /api/sensors/readings
 * Used by both simulation and future ESP32.
 */
async function postReading(req, res, next) {
  try {
    const {
      device_id,
      device_code,
      soil_moisture,
      air_temperature,
      air_humidity,
      tank_level,
      sensor_valid,
      source
    } = req.body;

    let deviceId = device_id;
    if (!deviceId && device_code) {
      const [d] = await pool.query(`SELECT id FROM devices WHERE device_code = ?`, [device_code]);
      if (!d.length) return error(res, 'UNKNOWN_DEVICE', 'Device not found', 404);
      deviceId = d[0].id;
    }
    if (!deviceId) {
      return error(res, 'VALIDATION_ERROR', 'device_id or device_code is required', 422);
    }

    // Validate ranges – never allow silent bad data
    if (soil_moisture !== undefined && soil_moisture !== null) {
      if (Number.isNaN(Number(soil_moisture)) || soil_moisture < 0 || soil_moisture > 100) {
        return error(res, 'VALIDATION_ERROR', 'soil_moisture must be between 0 and 100', 422);
      }
    }
    if (tank_level !== undefined && tank_level !== null) {
      if (Number.isNaN(Number(tank_level)) || tank_level < 0 || tank_level > 100) {
        return error(res, 'VALIDATION_ERROR', 'tank_level must be between 0 and 100', 422);
      }
    }

    const src = source === 'HARDWARE' ? 'HARDWARE' : 'SIMULATION';
    const valid = sensor_valid === false || sensor_valid === 0 ? 0 : 1;

    const [result] = await pool.query(
      `INSERT INTO sensor_readings
       (device_id, soil_moisture, air_temperature, air_humidity, tank_level, sensor_valid, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        soil_moisture ?? null,
        air_temperature ?? null,
        air_humidity ?? null,
        tank_level ?? null,
        valid,
        src
      ]
    );

    // Update last_seen
    await pool.query(
      `UPDATE devices SET last_seen = NOW(), connection_status = 'ONLINE' WHERE id = ?`,
      [deviceId]
    );

    return success(res, { id: result.insertId }, 'Reading saved', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  latest,
  history,
  latestByDevice,
  historyByDevice,
  createReading: postReading
};
