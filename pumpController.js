const { pool } = require('../config/db');
const { success, error } = require('../utils/response');
const irrigationService = require('../services/irrigationService');

async function status(req, res, next) {
  try {
    const deviceId = req.query.device_id || 1;
    const state = await irrigationService.getSystemState(deviceId);
    if (!state) return error(res, 'NOT_FOUND', 'System state not found', 404);

    const [cmds] = await pool.query(
      `SELECT * FROM pump_commands WHERE device_id = ? ORDER BY created_at DESC LIMIT 1`,
      [deviceId]
    );

    return success(res, {
      pump_status: state.pump_status,
      pump_source: state.pump_source,
      irrigation_mode: state.irrigation_mode,
      emergency_stop: !!state.emergency_stop,
      current_cycle_started: state.current_cycle_started,
      last_stop_at: state.last_stop_at,
      latest_command: cmds[0] || null,
      note:
        state.pump_source === 'SIMULATION'
          ? 'Status is SIMULATED – not a physical pump confirmation'
          : 'Status reported by device'
    });
  } catch (err) {
    next(err);
  }
}

async function listCommands(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const deviceId = req.query.device_id;

    let where = '1=1';
    const params = [];
    if (deviceId) {
      where += ' AND device_id = ?';
      params.push(deviceId);
    }

    const [rows] = await pool.query(
      `SELECT * FROM pump_commands WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function getCommand(req, res, next) {
  try {
    const [rows] = await pool.query(`SELECT * FROM pump_commands WHERE id = ?`, [req.params.id]);
    if (!rows.length) return error(res, 'NOT_FOUND', 'Command not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pump/command
 * Body: { device_id, command: 'ON'|'OFF'|'EMERGENCY_STOP' }
 */
async function sendCommand(req, res, next) {
  try {
    const { device_id, command } = req.body;
    if (!device_id || !['ON', 'OFF', 'EMERGENCY_STOP'].includes(command)) {
      return error(
        res,
        'VALIDATION_ERROR',
        'device_id and valid command (ON/OFF/EMERGENCY_STOP) required',
        422
      );
    }

    const state = await irrigationService.getSystemState(device_id);
    if (!state) return error(res, 'NOT_FOUND', 'Device system state not found', 404);

    if (command === 'ON') {
      const safety = await irrigationService.evaluateSafety(device_id);
      if (!safety.allowed) {
        return error(
          res,
          'SAFETY_BLOCKED',
          `Command blocked: ${safety.reasons.join('; ')}`,
          403,
          safety.reasons
        );
      }
    }

    const result = await irrigationService.requestPumpCommand(
      device_id,
      command,
      'MANUAL',
      req.user?.id || null
    );

    await irrigationService.recordEvent(
      device_id,
      state.irrigation_mode,
      command === 'ON' ? 'START' : 'STOP',
      command === 'EMERGENCY_STOP' ? 'Emergency stop requested' : `Manual command ${command}`,
      command === 'ON' ? 'ON' : 'OFF',
      'SIMULATION'
    );

    return success(
      res,
      {
        ...result,
        note: 'Command accepted and recorded. In SIMULATION mode pump state is updated by the simulator. Physical pump confirmation requires hardware acknowledgement.'
      },
      'Command accepted',
      202
    );
  } catch (err) {
    next(err);
  }
}

/** Device polls for pending commands */
async function pendingForDevice(req, res, next) {
  try {
    const deviceCode = req.query.device_code || req.headers['x-device-code'];
    if (!deviceCode) {
      return error(res, 'VALIDATION_ERROR', 'device_code required', 422);
    }
    const [devices] = await pool.query(`SELECT id FROM devices WHERE device_code = ?`, [deviceCode]);
    if (!devices.length) return error(res, 'UNKNOWN_DEVICE', 'Device not found', 404);
    const deviceId = devices[0].id;

    const [rows] = await pool.query(
      `SELECT * FROM pump_commands
       WHERE device_id = ? AND command_status = 'PENDING'
       ORDER BY created_at ASC LIMIT 5`,
      [deviceId]
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

/** Device acknowledges a command */
async function acknowledge(req, res, next) {
  try {
    const { acknowledgement, actual_pump_status } = req.body;
    const [result] = await pool.query(
      `UPDATE pump_commands
       SET command_status = 'ACKNOWLEDGED',
           acknowledgement = ?,
           acknowledged_at = NOW()
       WHERE id = ? AND command_status IN ('PENDING', 'SENT')`,
      [acknowledgement || 'ACK', req.params.id]
    );
    if (result.affectedRows === 0) {
      return error(res, 'NOT_FOUND', 'Command not found or already processed', 404);
    }

    if (actual_pump_status === 'ON' || actual_pump_status === 'OFF') {
      const [cmds] = await pool.query(`SELECT device_id FROM pump_commands WHERE id = ?`, [
        req.params.id
      ]);
      if (cmds.length) {
        await pool.query(
          `UPDATE system_state
           SET pump_status = ?, pump_source = 'HARDWARE', updated_at = NOW()
           WHERE device_id = ?`,
          [actual_pump_status, cmds[0].device_id]
        );
      }
    }

    return success(res, { id: Number(req.params.id), status: 'ACKNOWLEDGED' }, 'Command acknowledged');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  status,
  listCommands,
  getCommand,
  sendCommand,
  pendingForDevice,
  acknowledge
};
