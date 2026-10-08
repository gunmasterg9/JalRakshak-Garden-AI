# JalRakshak Garden AI — ESP32 Firmware & Calibration Guide

## ADC Calibration for Capacitive Soil Moisture Sensors

The ESP32 features a 12-bit Analog-to-Digital Converter returning raw integer values from **0 to 4095**.
Due to variations in PCB manufacturing, capacitive sensors output different raw voltages. Raw ADC numbers must therefore be calibrated against physical boundary states.

### Step 1: Dry Value Calibration (In Air)
1. Ensure the probe is completely clean and bone-dry.
2. Hold the probe in the air (do not touch the sensor probe with bare fingers).
3. Check the raw ADC value in the Serial Monitor or web UI under **IoT Settings**:
   ```text
   Raw ADC (Air): ~3100 to 3350
   ```
4. Click **"Save Dry Value"** (or define `DEFAULT_SOIL_DRY_ADC 3200` in `config.h`).

### Step 2: Wet Value Calibration (In Water)
1. Fill a cup with regular tap water.
2. Submerge the sensor blade up to the white guideline (do NOT submerge the electronic components at the top).
3. Check the raw ADC reading:
   ```text
   Raw ADC (Water): ~1300 to 1500
   ```
4. Click **"Save Wet Value"** (or define `DEFAULT_SOIL_WET_ADC 1400` in `config.h`).

### Formula Used:
$$\text{Soil Moisture \%} = \text{constrain}\left(\frac{\text{DRY\_VALUE} - \text{Raw ADC}}{\text{DRY\_VALUE} - \text{WET\_VALUE}} \times 100\%, 0.0, 100.0\right)$$

---

## Non-Blocking Execution Architecture

The firmware utilizes Arduino `millis()` timers to eliminate blocking calls:

```text
[Loop Tick]
    ├─ Every 10s: Check Wi-Fi state & auto-reconnect if dropped
    ├─ Every 5s:  Sample & average 10 ADC reads across sensors
    ├─ Real-time: Hardware safety watchdog (checks active pump timer & water cut-off)
    ├─ Every 30s: Construct JSON payload & dispatch HTTP POST to /api/iot/telemetry
    └─ If Offline > 15m: Autonomous local emergency survival check
```

This guarantees that pump shutoff watchdogs and safety interrupts execute instantaneously with microsecond responsiveness.
