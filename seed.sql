-- ============================================================
-- Smart Irrigation System - Seed / Demo Data
-- Run AFTER smart_irrigation_db.sql
-- ============================================================

USE smart_irrigation_db;

-- Demo admin user (password: Admin@123)
-- bcrypt hash generated for "Admin@123"
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Farm Admin', 'admin@irrigation.rw', '$2b$10$4vmkBozi1JL8pfOve3ihJOGDXbivqeH6kUUjT17zfQnqnF9mk2WJG', 'admin')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash);

-- Demo login: email = admin@irrigation.rw   password = Admin@123


-- Demo farm device (Rwanda vegetable farm)
INSERT INTO devices (device_code, device_name, location, device_type, operating_mode, connection_status, last_seen)
VALUES
('RWA-FARM-001', 'Kigali Vegetable Plot A', 'Kigali, Rwanda - Demo Farm', 'ESP32_IRRIGATION', 'SIMULATION', 'ONLINE', NOW())
ON DUPLICATE KEY UPDATE device_name = VALUES(device_name);

SET @device_id = (SELECT id FROM devices WHERE device_code = 'RWA-FARM-001' LIMIT 1);

-- Default irrigation settings (hysteresis 30% start / 45% stop)
INSERT INTO irrigation_settings (
  device_id,
  start_moisture_threshold,
  stop_moisture_threshold,
  maximum_runtime_seconds,
  cooldown_seconds,
  stale_reading_timeout_seconds,
  simulation_interval_ms,
  min_tank_level_percent
) VALUES (
  @device_id,
  30.00,
  45.00,
  600,
  300,
  120,
  5000,
  15.00
) ON DUPLICATE KEY UPDATE
  start_moisture_threshold = VALUES(start_moisture_threshold),
  stop_moisture_threshold = VALUES(stop_moisture_threshold);

-- System state for the device
INSERT INTO system_state (device_id, irrigation_mode, pump_status, pump_source, emergency_stop)
VALUES (@device_id, 'AUTO', 'OFF', 'SIMULATION', 0)
ON DUPLICATE KEY UPDATE irrigation_mode = VALUES(irrigation_mode);

-- A few sample sensor readings (marked as demonstration data - SIMULATION)
INSERT INTO sensor_readings (device_id, soil_moisture, air_temperature, air_humidity, tank_level, sensor_valid, source, created_at) VALUES
(@device_id, 42.50, 24.30, 68.00, 85.00, 1, 'SIMULATION', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(@device_id, 38.20, 24.80, 67.50, 85.00, 1, 'SIMULATION', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(@device_id, 34.10, 25.10, 66.80, 84.50, 1, 'SIMULATION', DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
(@device_id, 31.40, 25.40, 66.20, 84.00, 1, 'SIMULATION', NOW());

-- Sample resolved alert (demo)
INSERT INTO alerts (device_id, alert_type, severity, message, is_resolved, created_at, resolved_at)
VALUES
(@device_id, 'LOW_MOISTURE', 'INFO', 'Demo: Soil moisture approached start threshold (sample data).', 1, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 50 MINUTE));
