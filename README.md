# Smart Automated Irrigation System

Complete full-stack IoT-style irrigation monitor for a small vegetable farm in Rwanda.  
Works fully in **SIMULATION MODE** without any ESP32 or sensors. Later you can connect real hardware using the same API.

## Features

- Live soil moisture, tank level, temperature, humidity
- Automatic irrigation with hysteresis (start &lt; 30%, stop ≥ 45% by default)
- Manual control with backend safety checks
- MySQL persistence for readings, events, alerts, settings
- Simulation engine with scenarios (low tank, invalid sensor, offline, drying fast)
- React dashboard (dark navy + agricultural green)
- JWT auth, device API key for hardware, rate limiting
- ESP32 firmware sketch for a future hardware phase

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, React Router, Recharts, Lucide |
| Backend | Node.js, Express, mysql2, bcrypt, JWT, dotenv |
| Database | MySQL / MariaDB via XAMPP |
| Firmware | Arduino (ESP32) – not tested on hardware |

## Folder structure

```
smart-irrigation-system/
  frontend/     React app
  backend/      Express API + simulation
  database/     SQL schema + seed
  firmware/     ESP32 sketch
  docs/         Architecture, API, hardware, testing
  README.md
```

## Requirements

- Node.js 18+ (LTS recommended)
- XAMPP (MySQL/MariaDB + phpMyAdmin)
- Windows, macOS, or Linux

## 1. Database (XAMPP)

1. Open **XAMPP Control Panel** → Start **MySQL** (and Apache if you use phpMyAdmin).
2. Open http://localhost/phpmyadmin/
3. Import in order:
   - `database/smart_irrigation_db.sql`
   - `database/seed.sql`
4. Confirm database `smart_irrigation_db` exists with tables and demo device `RWA-FARM-001`.

### Database user

You can use the XAMPP `root` user (often empty password on fresh install) or create:

```sql
CREATE USER 'irrigation_app'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL ON smart_irrigation_db.* TO 'irrigation_app'@'localhost';
FLUSH PRIVILEGES;
```

If `root` has no password, set in `.env`:

```
DB_USER=root
DB_PASSWORD=
```

## 2. Backend

```cmd
cd smart-irrigation-system\backend
copy .env.example .env
```

Edit `.env` – set `DB_USER`, `DB_PASSWORD`, and long random values for `DEVICE_API_KEY` and `SESSION_SECRET`.

```cmd
npm install
npm run dev
```

API: http://localhost:5000/api/health  

Simulation starts automatically when the database is reachable and `SIMULATION_ENABLED` is true.

Stop: `Ctrl+C` in that terminal.

## 3. Frontend

```cmd
cd smart-irrigation-system\frontend
copy .env.example .env
npm install
npm run dev
```

Open http://localhost:5173  

**Demo login**

- Email: `admin@irrigation.rw`
- Password: `Admin@123`

Stop: `Ctrl+C`.

## 4. Verify simulation

1. Sign in → Dashboard should show changing moisture/tank values within seconds.
2. **Simulation** page: Start / Stop / scenarios / Reset (does **not** drop tables or users).
3. When moisture falls below the start threshold in AUTO mode, irrigation events appear.
4. **Control** page: Manual ON is blocked if tank is low or sensors invalid.

## 5. API quick reference

See `docs/api-documentation.md`. Important paths:

- `GET /api/health`, `GET /api/health/database`
- `POST /api/auth/login`
- `GET /api/sensors/latest`, `GET /api/sensors/history`
- `POST /api/pump/command` (auth required)
- `GET/POST /api/simulation/*` (auth required)

## 6. Hardware phase (later)

1. Wire sensors and relay as in `docs/hardware-wiring.md` and `firmware/esp32_irrigation/esp32_irrigation.ino`.
2. Set Wi-Fi, `API_BASE` (PC LAN IP), and `DEVICE_API_KEY` in the sketch.
3. ESP32 posts readings with `source: HARDWARE` and polls `/api/pump/pending`.
4. Switch device `operating_mode` to HARDWARE when ready.
5. **Never** claim the pump is ON until the device acknowledges with actual status.

Firmware has **not** been compiled or tested on real hardware in this project.

## 7. Tests

```cmd
cd backend
npm test
```

Some tests only check modules; full integration needs MySQL running.

## Security notes

- Classroom/local settings are **not** enough for public internet deployment.
- Use HTTPS, strong secrets, and restricted CORS in production.
- Never put `DEVICE_API_KEY` in the React app.
- Parameterized SQL is used throughout; passwords are bcrypt-hashed.

## Troubleshooting

| Problem | Check |
|---------|--------|
| DB connection failed | MySQL started? Correct user/password in `.env`? Database imported? |
| Frontend network error | Backend on port 5000? `VITE_API_BASE_URL` correct? |
| Login fails | Seed imported? Use `admin@irrigation.rw` / `Admin@123` |
| No changing readings | Simulation started? Device `RWA-FARM-001` in DB? |
| CORS errors | `FRONTEND_URL` in backend `.env` matches Vite origin |

## Known limitations

- ESP32 firmware is documentation-grade; not flashed/tested here.
- Offline detection for hardware depends on heartbeats / last_seen timeout (configurable).
- Simulation interval is process-level; changing DB `simulation_interval_ms` requires simulator restart for full effect in this version.
- No email/SMS push notifications – alerts are in-app only.

## License

MIT – educational / TVET use.
