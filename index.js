/**
 * Central API router – all endpoints under /api
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth, requireRole, requireDeviceKey } = require('../middleware/auth');

const health = require('../controllers/healthController');
const auth = require('../controllers/authController');
const devices = require('../controllers/deviceController');
const sensors = require('../controllers/sensorController');
const pump = require('../controllers/pumpController');
const irrigation = require('../controllers/irrigationController');
const settings = require('../controllers/settingsController');
const alerts = require('../controllers/alertController');
const simulation = require('../controllers/simulationController');

const router = express.Router();

// Rate limit sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many attempts. Try again later.' } }
});
const controlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many control requests.' } }
});

// ---------- Health ----------
router.get('/health', health.health);
router.get('/health/database', health.databaseHealth);
router.get('/system/status', health.systemStatus);

// ---------- Auth ----------
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.get('/auth/me', requireAuth, auth.me);
router.post('/auth/logout', requireAuth, auth.logout);

// ---------- Devices ----------
router.get('/devices', devices.list);
router.post('/devices', requireAuth, requireRole('admin'), devices.create);
router.get('/devices/:id', devices.getById);
router.put('/devices/:id', requireAuth, requireRole('admin', 'operator'), devices.update);
router.get('/devices/:id/status', devices.status);
router.post('/devices/:id/heartbeat', requireDeviceKey, devices.heartbeat);

// ---------- Sensors ----------
router.get('/sensors/latest', sensors.latest);
router.get('/sensors/history', sensors.history);
router.get('/sensors/:deviceId/latest', sensors.latestByDevice);
router.get('/sensors/:deviceId/history', sensors.historyByDevice);
router.post('/sensors/readings', requireDeviceKey, sensors.createReading);

// ---------- Pump ----------
router.get('/pump/status', pump.status);
router.get('/pump/commands', pump.listCommands);
router.get('/pump/commands/:id', pump.getCommand);
router.post('/pump/command', controlLimiter, requireAuth, requireRole('admin', 'operator'), pump.sendCommand);
// Device poll / acknowledge (hardware)
router.get('/pump/pending', requireDeviceKey, pump.pendingForDevice);
router.post('/pump/commands/:id/ack', requireDeviceKey, pump.acknowledge);

// ---------- Irrigation mode & events ----------
router.get('/irrigation/mode', irrigation.getMode);
router.put('/irrigation/mode', requireAuth, requireRole('admin', 'operator'), irrigation.setMode);
router.get('/irrigation/events', irrigation.listEvents);
router.get('/irrigation/events/:id', irrigation.getEvent);

// ---------- Settings ----------
router.get('/settings', settings.list);
router.get('/settings/:deviceId', settings.getByDevice);
router.put('/settings/:deviceId', requireAuth, requireRole('admin', 'operator'), settings.update);

// ---------- Alerts ----------
router.get('/alerts', alerts.list);
router.get('/alerts/active', alerts.active);
router.get('/alerts/:id', alerts.getById);
router.patch('/alerts/:id/resolve', requireAuth, requireRole('admin', 'operator'), alerts.resolve);

// ---------- Simulation (protected – never drives real hardware) ----------
router.get('/simulation/status', simulation.status);
router.post('/simulation/start', requireAuth, requireRole('admin', 'operator'), simulation.start);
router.post('/simulation/stop', requireAuth, requireRole('admin', 'operator'), simulation.stop);
router.post('/simulation/reset', requireAuth, requireRole('admin'), simulation.reset);
router.put('/simulation/scenario', requireAuth, requireRole('admin', 'operator'), simulation.setScenario);

module.exports = router;
