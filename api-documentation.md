# API Documentation

Base URL (development): `http://localhost:5000/api`

All successful responses:

```json
{ "success": true, "message": "OK", "data": { } }
```

Errors:

```json
{ "success": false, "error": { "code": "CODE", "message": "..." } }
```

## Health

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /health | No | API uptime |
| GET | /health/database | No | MySQL ping |
| GET | /system/status | No | API + DB + simulation |

## Auth

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | /auth/register | No | full_name, email, password, role? |
| POST | /auth/login | No | email, password → token |
| GET | /auth/me | Bearer | current user |
| POST | /auth/logout | Bearer | client discards token |

## Devices

| Method | Path | Auth |
|--------|------|------|
| GET | /devices | No |
| POST | /devices | admin |
| GET | /devices/:id | No |
| PUT | /devices/:id | admin/operator |
| GET | /devices/:id/status | No |
| POST | /devices/:id/heartbeat | X-Device-Key |

## Sensors

| Method | Path | Auth |
|--------|------|------|
| GET | /sensors/latest | No |
| GET | /sensors/history | No (page, limit, device_id, from, to, source) |
| POST | /sensors/readings | X-Device-Key |

## Pump

| Method | Path | Auth |
|--------|------|------|
| GET | /pump/status | No |
| GET | /pump/commands | No |
| POST | /pump/command | admin/operator – body: device_id, command |
| GET | /pump/pending | X-Device-Key |
| POST | /pump/commands/:id/ack | X-Device-Key |

Command acceptance does **not** mean the physical pump is ON.

## Irrigation / Settings / Alerts / Simulation

See routes in `backend/src/routes/index.js`. Simulation endpoints require auth and never drive real hardware.
