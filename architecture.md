# Architecture – Smart Automated Irrigation System

## Overview

```
[ React Dashboard ]  <--HTTP/JSON-->  [ Express REST API ]
                                            |
                                     [ MySQL / MariaDB ]
                                            ^
                     [ Simulation Engine ]--+
                     [ ESP32 Firmware   ]---+  (future)
```

- Frontend never talks to MySQL.
- Simulation and hardware both use the same API contracts (`POST /api/sensors/readings`, pump pending/ack).
- Irrigation decisions run in the backend `irrigationService` (safety + hysteresis).
- ESP32 polls pending commands and reports actual pump state; acceptance ≠ physical ON.

## Modes

| Mode | Readings source | Pump state |
|------|-----------------|------------|
| SIMULATION | Backend simulator | Updated in `system_state` as SIMULATION |
| HARDWARE | ESP32 HTTP posts | Only after device ACK with actual_pump_status |

## Key services

- `simulation/simulator.js` – timed ticks, scenarios, persistence
- `services/irrigationService.js` – evaluateSafety, runAutoLogic, requestPumpCommand
- `services/alertService.js` – deduplicated alerts

## Safety (always backend-enforced)

1. Device exists  
2. Valid, recent reading  
3. Soil moisture present (never treat missing as 0)  
4. Tank above minimum  
5. Not already ON / cooldown / max runtime  
6. Emergency stop clear  
