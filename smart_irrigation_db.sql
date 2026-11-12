-- ============================================================
-- Smart Irrigation System - Database Schema
-- Compatible with XAMPP MySQL / MariaDB
-- Database: smart_irrigation_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_irrigation_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_irrigation_db;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'operator', 'viewer') NOT NULL DEFAULT 'operator',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- devices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_code       VARCHAR(64) NOT NULL,
  device_name       VARCHAR(120) NOT NULL,
  location          VARCHAR(200) DEFAULT NULL,
  device_type       VARCHAR(50) NOT NULL DEFAULT 'ESP32_IRRIGATION',
  operating_mode    ENUM('SIMULATION', 'HARDWARE') NOT NULL DEFAULT 'SIMULATION',
  connection_status ENUM('ONLINE', 'OFFLINE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  last_seen         DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_devices_code (device_code)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- sensor_readings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sensor_readings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id       INT UNSIGNED NOT NULL,
  soil_moisture   DECIMAL(5,2) DEFAULT NULL COMMENT '0-100 %',
  air_temperature DECIMAL(5,2) DEFAULT NULL COMMENT 'Celsius',
  air_humidity    DECIMAL(5,2) DEFAULT NULL COMMENT '0-100 %',
  tank_level      DECIMAL(5,2) DEFAULT NULL COMMENT '0-100 %',
  sensor_valid    TINYINT(1) NOT NULL DEFAULT 1,
  source          ENUM('SIMULATION', 'HARDWARE') NOT NULL DEFAULT 'SIMULATION',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_readings_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_readings_device_time (device_id, created_at),
  INDEX idx_readings_source (source)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- irrigation_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS irrigation_settings (
  id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id                   INT UNSIGNED NOT NULL,
  start_moisture_threshold    DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  stop_moisture_threshold     DECIMAL(5,2) NOT NULL DEFAULT 45.00,
  maximum_runtime_seconds     INT UNSIGNED NOT NULL DEFAULT 600,
  cooldown_seconds            INT UNSIGNED NOT NULL DEFAULT 300,
  stale_reading_timeout_seconds INT UNSIGNED NOT NULL DEFAULT 120,
  simulation_interval_ms      INT UNSIGNED NOT NULL DEFAULT 5000,
  min_tank_level_percent      DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE KEY uq_settings_device (device_id),
  CONSTRAINT chk_moisture_hysteresis CHECK (stop_moisture_threshold > start_moisture_threshold)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- pump_commands
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pump_commands (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id        INT UNSIGNED NOT NULL,
  requested_by     INT UNSIGNED DEFAULT NULL COMMENT 'user id or NULL for system',
  command          ENUM('ON', 'OFF', 'EMERGENCY_STOP') NOT NULL,
  command_status   ENUM('PENDING', 'SENT', 'ACKNOWLEDGED', 'TIMEOUT', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  source           ENUM('AUTO', 'MANUAL', 'SIMULATION', 'HARDWARE') NOT NULL DEFAULT 'AUTO',
  acknowledgement  VARCHAR(255) DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at  DATETIME DEFAULT NULL,
  CONSTRAINT fk_commands_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_commands_user FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_commands_device_status (device_id, command_status),
  INDEX idx_commands_created (created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- irrigation_events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS irrigation_events (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id        INT UNSIGNED NOT NULL,
  mode             ENUM('AUTO', 'MANUAL') NOT NULL,
  event_type       ENUM('START', 'STOP') NOT NULL,
  reason           VARCHAR(255) NOT NULL,
  pump_status      ENUM('ON', 'OFF', 'UNKNOWN') NOT NULL,
  source           ENUM('SIMULATION', 'HARDWARE') NOT NULL DEFAULT 'SIMULATION',
  duration_seconds INT UNSIGNED DEFAULT NULL,
  started_at       DATETIME DEFAULT NULL,
  ended_at         DATETIME DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_events_device_time (device_id, created_at),
  INDEX idx_events_source (source)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id   INT UNSIGNED DEFAULT NULL,
  alert_type  VARCHAR(80) NOT NULL,
  severity    ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL DEFAULT 'WARNING',
  message     VARCHAR(500) NOT NULL,
  is_resolved TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_alerts_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
  INDEX idx_alerts_active (is_resolved, created_at),
  INDEX idx_alerts_type (alert_type)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- system_state (singleton-style helper for mode / pump state)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_state (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id             INT UNSIGNED NOT NULL,
  irrigation_mode       ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO',
  pump_status           ENUM('ON', 'OFF', 'UNKNOWN') NOT NULL DEFAULT 'OFF',
  pump_source           ENUM('SIMULATION', 'HARDWARE') NOT NULL DEFAULT 'SIMULATION',
  current_cycle_started DATETIME DEFAULT NULL,
  last_stop_at          DATETIME DEFAULT NULL,
  emergency_stop        TINYINT(1) NOT NULL DEFAULT 0,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_state_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE KEY uq_state_device (device_id)
) ENGINE=InnoDB;
