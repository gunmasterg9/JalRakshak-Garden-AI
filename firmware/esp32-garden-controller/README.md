# JalRakshak Garden AI — ESP32 Firmware

This firmware turns an **ESP32 Dev Module** into a real-world, privacy-first smart garden controller.

## Features
- **Non-blocking timing**: Scheduled via `millis()`. Never freezes the main execution loop.
- **Sensors supported**:
  - DHT11 / DHT22 (Temperature °C & Relative Humidity %)
  - Capacitive Soil Moisture Sensor v1.2 / v2.0 (with 12-bit ADC multi-sample smoothing)
  - Water Tank Level Sensor (Analog resistive or float switch)
  - Water Flow Sensor YF-S201 (pulse input)
- **Multi-Layer Hardware Watchdog**:
  - Hard cutoff at **60 seconds** maximum continuous pump runtime.
  - Mandatory **120 seconds** cooldown between watering runs to prevent motor burn-in.
  - Critical water-level cutoff (< 15%) stops pump to avoid dry-run damage.
- **Local Fallback Intelligence**: If Wi-Fi/Server disconnects for > 15 minutes and soil moisture reaches catastrophic drought (< 18%), the ESP32 performs an autonomous 15-second emergency hydration cycle.
- **HTTP JSON Telemetry**: Transmits sensor readings to FastAPI at `/api/iot/telemetry`.

---

## Pinout Map

| Component | ESP32 GPIO | Pin Type | Notes |
|---|---|---|---|
| **DHT11 Data** | `GPIO 4` | Digital I/O | Use 4.7kΩ or 10kΩ pull-up resistor to 3.3V |
| **Capacitive Soil Moisture** | `GPIO 34` | ADC1 Input | Analog only (ADC1 avoids Wi-Fi conflict) |
| **Water Level Sensor** | `GPIO 35` | ADC1 Input | Analog or float switch pull-up |
| **Pump Relay / MOSFET** | `GPIO 16` | Digital Output | Connect to Gate or Relay IN (NEVER directly to pump) |
| **Flow Sensor (YF-S201)** | `GPIO 14` | Digital Input | Interrupt pulse pin with pull-up |
| **Status LED** | `GPIO 2` | Digital Output | Solid: Connected, Blinking/Off: Searching Wi-Fi |

---

## Building and Flashing

### Using PlatformIO:
```bash
cd firmware/esp32-garden-controller
pio run --target upload
pio device monitor -b 115200
```

### Using Arduino IDE:
1. Install `ESP32` board support from Espressif in the Boards Manager.
2. Install libraries:
   - `DHT sensor library` by Adafruit
   - `ArduinoJson` (v6.x) by Benoit Blanchon
3. Open `src/main.cpp`, configure your Wi-Fi credentials in `include/config.h`, and upload.
