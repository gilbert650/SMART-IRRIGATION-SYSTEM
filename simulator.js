/**
 * Backend simulation engine.
 * Generates realistic changing readings and drives the same persistence
 * and irrigation logic that real hardware will use.
 */
const { pool } = require('../config/db');
const irrigationService = require('../services/irrigationService');
const alertService = require('../services/alertService');

let intervalHandle = null;
let running = false;
let scenario = 'normal'; // normal | low_tank | invalid_sensor | offline | drying_fast

// In-memory simulation state (per device)
const simState = new Map();

function getOrInitState(deviceId) {
  if (!simState.has(deviceId)) {
    simState.set(deviceId, {
      soilMoisture: 40 + Math.random() * 10,
      tankLevel: 70 + Math.random() * 20,
      airTemp: 22 + Math.random() * 6,
      airHumidity: 55 + Math.random() * 20,
      valid: true,
      online: true
    });
  }
  return simState.get(deviceId);
}

/**
 * One simulation tick for a device.
 */
async function tickDevice(deviceId) {
  const state = getOrInitState(deviceId);
  const sys = await irrigationService.getSystemState(deviceId);
  const settings = await irrigationService.getSettings(deviceId);
  if (!sys || !settings) return;

  // Scenario overrides
  if (scenario === 'offline') {
    state.online = false;
    await pool.query(
      `UPDATE devices SET connection_status = 'OFFLINE', updated_at = NOW() WHERE id = ?`,
      [deviceId]
    );
    await alertService.createAlert(deviceId, 'DEVICE_OFFLINE', 'WARNING', 'Simulated device went offline');
    return;
  }

  state.online = true;
  await pool.query(
    `UPDATE devices SET connection_status = 'ONLINE', last_seen = NOW(), updated_at = NOW() WHERE id = ?`,
    [deviceId]
  );

  if (scenario === 'invalid_sensor') {
    state.valid = false;
  } else {
    state.valid = true;
  }

  // Soil moisture dynamics
  if (sys.pump_status === 'ON') {
    // Irrigation increases moisture
    state.soilMoisture = Math.min(95, state.soilMoisture + 1.5 + Math.random() * 1.5);
    // Tank decreases
    state.tankLevel = Math.max(0, state.tankLevel - (0.8 + Math.random() * 0.7));
  } else {
    // Natural drying
    const dryRate = scenario === 'drying_fast' ? 1.2 : 0.35;
    state.soilMoisture = Math.max(5, state.soilMoisture - (dryRate + Math.random() * 0.3));
  }

  if (scenario === 'low_tank') {
    state.tankLevel = Math.min(state.tankLevel, 10 + Math.random() * 4);
  } else if (sys.pump_status !== 'ON' && state.tankLevel < 90) {
    // Slow natural "refill" demo when not irrigating
    state.tankLevel = Math.min(95, state.tankLevel + 0.05);
  }

  // Temperature / humidity mild drift
  state.airTemp += (Math.random() - 0.5) * 0.4;
  state.airTemp = Math.max(15, Math.min(38, state.airTemp));
  state.airHumidity += (Math.random() - 0.5) * 1.2;
  state.airHumidity = Math.max(30, Math.min(95, state.airHumidity));

  // Persist reading
  await pool.query(
    `INSERT INTO sensor_readings
     (device_id, soil_moisture, air_temperature, air_humidity, tank_level, sensor_valid, source)
     VALUES (?, ?, ?, ?, ?, ?, 'SIMULATION')`,
    [
      deviceId,
      Number(state.soilMoisture.toFixed(2)),
      Number(state.airTemp.toFixed(2)),
      Number(state.airHumidity.toFixed(2)),
      Number(state.tankLevel.toFixed(2)),
      state.valid ? 1 : 0
    ]
  );

  // Run automatic irrigation logic
  try {
    await irrigationService.runAutoLogic(deviceId);
  } catch (err) {
    console.error('[SIM] Auto logic error:', err.message);
  }
}

async function getPrimaryDeviceId() {
  const [rows] = await pool.query(
    `SELECT id FROM devices WHERE device_code = 'RWA-FARM-001' LIMIT 1`
  );
  if (rows.length) return rows[0].id;
  const [any] = await pool.query(`SELECT id FROM devices LIMIT 1`);
  return any[0]?.id || null;
}

async function start() {
  if (running) return { running: true, message: 'Simulation already running' };
  running = true;

  const tick = async () => {
    if (!running) return;
    try {
      const deviceId = await getPrimaryDeviceId();
      if (deviceId) await tickDevice(deviceId);
    } catch (err) {
      console.error('[SIM] Tick error:', err.message);
    }
  };

  // Immediate first tick
  await tick();

  const intervalMs = Number(process.env.SIMULATION_INTERVAL_MS) || 5000;
  intervalHandle = setInterval(tick, intervalMs);

  console.log(`[SIM] Simulation started (interval ${intervalMs}ms, scenario=${scenario})`);
  return { running: true, intervalMs, scenario };
}

function stop() {
  running = false;
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  console.log('[SIM] Simulation stopped');
  return { running: false };
}

function getStatus() {
  return {
    running,
    scenario,
    devices: Array.from(simState.entries()).map(([id, s]) => ({
      deviceId: id,
      soilMoisture: Number(s.soilMoisture.toFixed(2)),
      tankLevel: Number(s.tankLevel.toFixed(2)),
      airTemp: Number(s.airTemp.toFixed(2)),
      airHumidity: Number(s.airHumidity.toFixed(2)),
      valid: s.valid,
      online: s.online
    }))
  };
}

function setScenario(name) {
  const allowed = ['normal', 'low_tank', 'invalid_sensor', 'offline', 'drying_fast'];
  if (!allowed.includes(name)) {
    throw Object.assign(new Error(`Invalid scenario. Allowed: ${allowed.join(', ')}`), {
      status: 400,
      code: 'INVALID_SCENARIO'
    });
  }
  scenario = name;
  // Reset validity/online for cleaner scenario changes
  for (const s of simState.values()) {
    if (name !== 'invalid_sensor') s.valid = true;
    if (name !== 'offline') s.online = true;
  }
  return { scenario };
}

/**
 * Soft reset of simulation state only – never drops tables or users.
 */
async function resetDemo() {
  const deviceId = await getPrimaryDeviceId();
  if (!deviceId) return { message: 'No device found' };

  simState.set(deviceId, {
    soilMoisture: 42,
    tankLevel: 85,
    airTemp: 24,
    airHumidity: 65,
    valid: true,
    online: true
  });

  await pool.query(
    `UPDATE system_state
     SET pump_status = 'OFF',
         current_cycle_started = NULL,
         emergency_stop = 0,
         last_stop_at = NULL,
         irrigation_mode = 'AUTO',
         pump_source = 'SIMULATION',
         updated_at = NOW()
     WHERE device_id = ?`,
    [deviceId]
  );

  await pool.query(
    `UPDATE devices SET connection_status = 'ONLINE', last_seen = NOW() WHERE id = ?`,
    [deviceId]
  );

  scenario = 'normal';
  return { message: 'Simulation state reset (users and schema untouched)', scenario };
}

module.exports = {
  start,
  stop,
  getStatus,
  setScenario,
  resetDemo,
  isRunning: () => running
};
