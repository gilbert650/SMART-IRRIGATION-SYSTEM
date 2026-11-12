# Testing Guide

## Manual checks (simulation)

1. Start MySQL (XAMPP), import SQL, configure `.env`.
2. `cd backend && npm install && npm run dev`
3. `GET http://localhost:5000/api/health` → success
4. `GET http://localhost:5000/api/health/database` → database UP
5. Login via frontend or `POST /api/auth/login`
6. Simulation page → Start → Dashboard moisture values change over time
7. When moisture &lt; 30%, AUTO mode should request pump ON (SIMULATION source)
8. When moisture ≥ 45% or tank low, pump should stop
9. Manual ON with low tank → SAFETY_BLOCKED
10. Settings change persists after backend restart

## Automated tests

```bash
cd backend
npm test
```

Tests that need a running MySQL will skip or fail if the database is down – that is expected.

## Not tested on hardware

ESP32 firmware, real sensors, and physical pump driver have **not** been run on real devices in this delivery.
