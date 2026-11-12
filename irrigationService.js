/**
 * Automatic irrigation logic with safety checks and hysteresis.
 * All decisions go through this service – never trust the frontend alone.
 */
const { pool } = require('../config/db');
const alertService = require('./alertService');

async function getSettings(deviceId) {
  const [rows] = await pool.query(
    'SELECT * FROM irrigation_settings WHERE device_id = ? LIMIT 1',
    [deviceId]
  );
  return rows[0] || null;
}

async function getSystemState(deviceId) {
  const [rows] = await pool.query(
    'SELECT * FROM system_state WHERE device_id = ? LIMIT 1',
    [deviceId]
  );
  return rows[0] || null;
}

async function getLatestReading(deviceId) {
  const [rows] = await pool.query(
    `SELECT * FROM sensor_readings
     WHERE device_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [deviceId]
  );
  return rows[0] || null;
}

/**
 * Evaluate all safety conditions before allowing pump ON.
 * Returns { allowed: boolean, reasons: string[] }
 */
async function evaluateSafety(deviceId, reading = null) {
  const reasons = [];
  const settings = await getSettings(deviceId);
  const state = await getSystemState(deviceId);
  const latest = reading || (await getLatestReading(deviceId));

  if (!settings) {
    reasons.push('No irrigation settings found for device');
    return { allowed: false, reasons };
  }
  if (!state) {
    reasons.push('No system state found for device');
    return { allowed: false, reasons };
  }
  if (state.emergency_stop) {
    reasons.push('Emergency stop is active');
  }
  if (!latest) {
    reasons.push('No sensor reading available');
    return { allowed: false, reasons, settings, state, latest: null };
  }
  if (!latest.sensor_valid) {
    reasons.push('Latest sensor reading is marked invalid');
  }
  if (latest.soil_moisture === null || latest.soil_moisture === undefined) {
    reasons.push('Soil moisture value is missing (never treat as zero)');
  }
  // Stale check
  const ageMs = Date.now() - new Date(latest.created_at).getTime();
  if (ageMs > settings.stale_reading_timeout_seconds * 1000) {
    reasons.push(
      `Sensor reading is stale (${Math.round(ageMs / 1000)}s old, timeout ${settings.stale_reading_timeout_seconds}s)`
    );
  }
  // Tank level
  if (latest.tank_level !== null && latest.tank_level < settings.min_tank_level_percent) {
    reasons.push(
      `Water tank too low (${latest.tank_level}% < ${settings.min_tank_level_percent}%)`
    );
  }
  // Already running
  if (state.pump_status === 'ON') {
    reasons.push('Pump is already ON');
  }
  // Cooldown
  if (state.last_stop_at) {
    const sinceStop = Date.now() - new Date(state.last_stop_at).getTime();
    if (sinceStop < settings.cooldown_seconds * 1000) {
      reasons.push(
        `Cooldown active (${Math.round((settings.cooldown_seconds * 1000 - sinceStop) / 1000)}s remaining)`
      );
    }
  }
  // Max runtime already exceeded in current cycle
  if (state.current_cycle_started && state.pump_status === 'ON') {
    const runtime = (Date.now() - new Date(state.current_cycle_started).getTime()) / 1000;
    if (runtime >= settings.maximum_runtime_seconds) {
      reasons.push('Maximum runtime already reached');
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    settings,
    state,
    latest
  };
}

/**
 * Request pump command (ON / OFF / EMERGENCY_STOP).
 * Does NOT claim the physical pump is running – only records the request.
 */
async function requestPumpCommand(deviceId, command, source, userId = null) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO pump_commands (device_id, requested_by, command, command_status, source)
       VALUES (?, ?, ?, 'PENDING', ?)`,
      [deviceId, userId, command, source]
    );

    // Update system state optimistically for simulation; hardware will acknowledge
    if (source === 'SIMULATION' || source === 'AUTO' || source === 'MANUAL') {
      if (command === 'ON') {
        await conn.query(
          `UPDATE system_state
           SET pump_status = 'ON',
               pump_source = ?,
               current_cycle_started = NOW(),
               emergency_stop = 0,
               updated_at = NOW()
           WHERE device_id = ?`,
          [source === 'SIMULATION' ? 'SIMULATION' : 'SIMULATION', deviceId]
        );
      } else if (command === 'OFF' || command === 'EMERGENCY_STOP') {
        await conn.query(
          `UPDATE system_state
           SET pump_status = 'OFF',
               last_stop_at = NOW(),
               current_cycle_started = NULL,
               emergency_stop = ?,
               updated_at = NOW()
           WHERE device_id = ?`,
          [command === 'EMERGENCY_STOP' ? 1 : 0, deviceId]
        );
      }
    }

    await conn.commit();
    return { commandId: result.insertId, status: 'PENDING' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Record an irrigation event (START or STOP).
 */
async function recordEvent(deviceId, mode, eventType, reason, pumpStatus, source, durationSeconds = null, startedAt = null, endedAt = null) {
  const [result] = await pool.query(
    `INSERT INTO irrigation_events
     (device_id, mode, event_type, reason, pump_status, source, duration_seconds, started_at, ended_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [deviceId, mode, eventType, reason, pumpStatus, source, durationSeconds, startedAt, endedAt]
  );
  return result.insertId;
}

/**
 * Core automatic decision loop for one device.
 * Called by the simulation engine on each tick.
 */
async function runAutoLogic(deviceId) {
  const state = await getSystemState(deviceId);
  if (!state || state.irrigation_mode !== 'AUTO') {
    return { action: 'NONE', reason: 'Not in AUTO mode' };
  }
  if (state.emergency_stop) {
    if (state.pump_status === 'ON') {
      await requestPumpCommand(deviceId, 'EMERGENCY_STOP', 'AUTO');
      await recordEvent(deviceId, 'AUTO', 'STOP', 'Emergency stop active', 'OFF', 'SIMULATION');
      return { action: 'EMERGENCY_STOP', reason: 'Emergency stop' };
    }
    return { action: 'NONE', reason: 'Emergency stop active' };
  }

  const safety = await evaluateSafety(deviceId);
  const { settings, latest } = safety;

  // If pump is ON, check stop conditions
  if (state.pump_status === 'ON') {
    let shouldStop = false;
    let stopReason = '';

    if (!latest || !latest.sensor_valid) {
      shouldStop = true;
      stopReason = 'Invalid or missing sensor reading while pumping';
      await alertService.createAlert(deviceId, 'INVALID_SENSOR', 'CRITICAL', stopReason);
    } else if (latest.soil_moisture !== null && latest.soil_moisture >= settings.stop_moisture_threshold) {
      shouldStop = true;
      stopReason = `Soil moisture reached stop threshold (${latest.soil_moisture}% >= ${settings.stop_moisture_threshold}%)`;
    } else if (latest.tank_level !== null && latest.tank_level < settings.min_tank_level_percent) {
      shouldStop = true;
      stopReason = `Tank level too low during irrigation (${latest.tank_level}%)`;
      await alertService.createAlert(deviceId, 'LOW_TANK', 'CRITICAL', stopReason);
    } else if (state.current_cycle_started) {
      const runtime = (Date.now() - new Date(state.current_cycle_started).getTime()) / 1000;
      if (runtime >= settings.maximum_runtime_seconds) {
        shouldStop = true;
        stopReason = `Maximum runtime reached (${Math.round(runtime)}s)`;
        await alertService.createAlert(deviceId, 'MAX_RUNTIME', 'WARNING', stopReason);
      }
    }

    // Stale while pumping
    if (latest) {
      const ageMs = Date.now() - new Date(latest.created_at).getTime();
      if (ageMs > settings.stale_reading_timeout_seconds * 1000) {
        shouldStop = true;
        stopReason = 'Sensor reading became stale while pumping';
        await alertService.createAlert(deviceId, 'STALE_READING', 'CRITICAL', stopReason);
      }
    }

    if (shouldStop) {
      const startedAt = state.current_cycle_started;
      const duration = startedAt
        ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
        : null;
      await requestPumpCommand(deviceId, 'OFF', 'AUTO');
      await recordEvent(
        deviceId,
        'AUTO',
        'STOP',
        stopReason,
        'OFF',
        'SIMULATION',
        duration,
        startedAt,
        new Date()
      );
      return { action: 'STOP', reason: stopReason };
    }
    return { action: 'NONE', reason: 'Pump running, conditions still met' };
  }

  // Pump is OFF – check whether we should start
  if (
    latest &&
    latest.sensor_valid &&
    latest.soil_moisture !== null &&
    latest.soil_moisture < settings.start_moisture_threshold
  ) {
    if (safety.allowed) {
      await requestPumpCommand(deviceId, 'ON', 'AUTO');
      await recordEvent(
        deviceId,
        'AUTO',
        'START',
        `Soil moisture below start threshold (${latest.soil_moisture}% < ${settings.start_moisture_threshold}%)`,
        'ON',
        'SIMULATION',
        null,
        new Date(),
        null
      );
      await alertService.createAlert(
        deviceId,
        'LOW_MOISTURE',
        'INFO',
        `Automatic irrigation started – soil moisture ${latest.soil_moisture}%`
      );
      return { action: 'START', reason: 'Dry soil' };
    } else {
      // Safety blocked – create informative alert once
      await alertService.createAlert(
        deviceId,
        'IRRIGATION_BLOCKED',
        'WARNING',
        `Irrigation blocked: ${safety.reasons.join('; ')}`
      );
      return { action: 'BLOCKED', reason: safety.reasons.join('; ') };
    }
  }

  return { action: 'NONE', reason: 'Soil moisture OK or no action needed' };
}

/**
 * Set irrigation mode (AUTO / MANUAL)
 */
async function setMode(deviceId, mode) {
  if (!['AUTO', 'MANUAL'].includes(mode)) {
    throw Object.assign(new Error('Mode must be AUTO or MANUAL'), { status: 400, code: 'INVALID_MODE' });
  }
  await pool.query(
    `UPDATE system_state SET irrigation_mode = ?, updated_at = NOW() WHERE device_id = ?`,
    [mode, deviceId]
  );
  return { irrigation_mode: mode };
}

module.exports = {
  getSettings,
  getSystemState,
  getLatestReading,
  evaluateSafety,
  requestPumpCommand,
  recordEvent,
  runAutoLogic,
  setMode
};
