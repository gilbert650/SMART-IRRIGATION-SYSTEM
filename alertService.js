const { pool } = require('../config/db');

/**
 * Create an alert if a similar unresolved one does not already exist
 * (simple deduplication by type + device within a time window).
 */
async function createAlert(deviceId, alertType, severity, message) {
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query(
      `SELECT id FROM alerts
       WHERE device_id <=> ? AND alert_type = ? AND is_resolved = 0
         AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       LIMIT 1`,
      [deviceId, alertType]
    );

    if (existing.length > 0) {
      return existing[0].id; // already active
    }

    const [result] = await conn.query(
      `INSERT INTO alerts (device_id, alert_type, severity, message)
       VALUES (?, ?, ?, ?)`,
      [deviceId, alertType, severity, message]
    );
    return result.insertId;
  } finally {
    conn.release();
  }
}

async function getActiveAlerts(deviceId = null) {
  let sql = `SELECT a.*, d.device_code, d.device_name
             FROM alerts a
             LEFT JOIN devices d ON d.id = a.device_id
             WHERE a.is_resolved = 0`;
  const params = [];
  if (deviceId) {
    sql += ' AND a.device_id = ?';
    params.push(deviceId);
  }
  sql += ' ORDER BY a.created_at DESC LIMIT 100';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getAlerts({ deviceId, resolved, page = 1, limit = 20 }) {
  const offset = (Math.max(1, page) - 1) * limit;
  let where = '1=1';
  const params = [];
  if (deviceId) {
    where += ' AND a.device_id = ?';
    params.push(deviceId);
  }
  if (resolved !== undefined && resolved !== null) {
    where += ' AND a.is_resolved = ?';
    params.push(resolved ? 1 : 0);
  }
  const [rows] = await pool.query(
    `SELECT a.*, d.device_code, d.device_name
     FROM alerts a
     LEFT JOIN devices d ON d.id = a.device_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM alerts a WHERE ${where}`,
    params
  );
  return { data: rows, total: countRows[0].total, page: Number(page), limit: Number(limit) };
}

async function resolveAlert(alertId) {
  const [result] = await pool.query(
    `UPDATE alerts SET is_resolved = 1, resolved_at = NOW() WHERE id = ? AND is_resolved = 0`,
    [alertId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createAlert,
  getActiveAlerts,
  getAlerts,
  resolveAlert
};
