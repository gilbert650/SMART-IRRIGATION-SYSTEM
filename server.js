/**
 * Server entry point
 */
require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');
const simulator = require('./simulation/simulator');

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  console.log('========================================');
  console.log('  Smart Irrigation System – Backend');
  console.log('========================================');

  const db = await testConnection();
  if (db.ok) {
    console.log('[DB] Connected to MySQL successfully');
  } else {
    console.warn('[DB] WARNING: Database not available –', db.error || db.message);
    console.warn('[DB] API will start but data endpoints will fail until MySQL is running.');
  }

  app.listen(PORT, () => {
    console.log(`[API] Listening on http://localhost:${PORT}/api`);
    console.log(`[API] Health: http://localhost:${PORT}/api/health`);
  });

  // Auto-start simulation in development when enabled
  if (process.env.SIMULATION_ENABLED === 'true' || process.env.SIMULATION_ENABLED === undefined) {
    try {
      if (db.ok) {
        await simulator.start();
        console.log('[SIM] Simulation engine started automatically');
      }
    } catch (err) {
      console.error('[SIM] Failed to start simulation:', err.message);
    }
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
