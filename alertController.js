const { pool } = require('../config/db');
const { success, error } = require('../utils/response');

async function list(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const deviceId = req.query.device_id;
    const resolved = req.query.resolved; // '0' | '1'

    let where = '1=1';
    const params = [];
    if (deviceId) {
      where += ' AND a.device_id = ?';
      params.push(deviceId);
    }
    if (resolved === '0' || resolved === '1') {
      where += ' AND a.is_resolved = ?';
      params.push(Number(resolved));
    }

    const [rows] = await pool.query(
      `SELECT a.*, d.device_code, d.device_name
       FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM alerts a WHERE ${where}`,
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

async function active(req, res, next) {
  try {
    const deviceId = req.query.device_id;
    let sql = `
      SELECT a.*, d.device_code, d.device_name
      FROM alerts a
      LEFT JOIN devices d ON d.id = a.device_id
      WHERE a.is_resolved = 0
    `;
    const params = [];
    if (deviceId) {
      sql += ' AND a.device_id = ?';
      params.push(deviceId);
    }
    sql += ' ORDER BY a.created_at DESC LIMIT 50';
    const [rows] = await pool.query(sql, params);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, d.device_code FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'NOT_FOUND', 'Alert not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function resolve(req, res, next) {
  try {
    const [result] = await pool.query(
      `UPDATE alerts SET is_resolved = 1, resolved_at = NOW()
       WHERE id = ? AND is_resolved = 0`,
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return error(res, 'NOT_FOUND', 'Alert not found or already resolved', 404);
    }
    return success(res, { id: Number(req.params.id), is_resolved: true }, 'Alert resolved');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, active, getById, resolve };
