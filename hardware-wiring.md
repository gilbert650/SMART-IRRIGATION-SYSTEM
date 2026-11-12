# Hardware Wiring Guidance (Future Phase)

**Warning:** Never power a water pump from an ESP32 GPIO. Use a properly rated relay or MOSFET driver and a separate power supply. Keep water away from electronics.

## Suggested connections

| Component | ESP32 pin | Notes |
|-----------|-----------|-------|
| Capacitive soil moisture AOUT | GPIO 34 (ADC1) | Calibrate dry/wet ADC values |
| Tank level / float | GPIO 35 or digital | Float switch preferred for simplicity |
| DHT22 data | GPIO 4 | Optional temp/humidity |
| Relay IN | GPIO 26 | Controls pump driver only |
| Pump | Relay COM/NO + own PSU | Match voltage/current ratings |

## Network

- ESP32 and PC must be on the same LAN (or use a reachable public API with HTTPS).
- Set `API_BASE` to the PC’s LAN IP, e.g. `http://192.168.1.10:5000/api`.
- Set `DEVICE_API_KEY` to the same value as backend `.env` – never put this key in React.

## Safety on device

- Local maximum runtime independent of the server
- Stop pump on Wi-Fi loss if desired (application choice)
- Command expiry: pending commands older than a few minutes should be ignored/cancelled server-side
