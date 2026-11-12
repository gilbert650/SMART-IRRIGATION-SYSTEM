# Database Design

Database: `smart_irrigation_db` (utf8mb4)

## Tables

- **users** – dashboard accounts (bcrypt password_hash, role)
- **devices** – device_code UNIQUE, operating_mode SIMULATION|HARDWARE, connection_status
- **sensor_readings** – moisture/temp/humidity/tank, sensor_valid, source SIMULATION|HARDWARE
- **irrigation_settings** – thresholds, max runtime, cooldown, stale timeout, min tank (CHECK hysteresis)
- **pump_commands** – ON/OFF/EMERGENCY_STOP, status PENDING→ACKNOWLEDGED, source
- **irrigation_events** – START/STOP with reason and duration
- **alerts** – typed alerts with severity and resolution
- **system_state** – per-device mode, pump_status, pump_source, emergency_stop

Import order: `smart_irrigation_db.sql` then `seed.sql`.
