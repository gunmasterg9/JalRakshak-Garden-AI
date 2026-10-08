# JalRakshak Garden AI — Hardware Architecture & Component Guide

## Overview

JalRakshak Garden AI connects physical garden soil and weather sensors with a local-first FastAPI server and open-weight AI (Ollama). The primary hardware controller is an **ESP32 Dev Module (WROOM-32)**.

```text
  [Garden Sensors]           [ESP32 Controller]          [Local Host PC]
  - DHT11 / DHT22      ───>  - ADC1 Sampling      ───>   - FastAPI Backend (:8000)
  - Capacitive Soil    ───>  - Wi-Fi 802.11 b/g/n        - SQLite Database
  - Water Level Float  ───>  - Local Safety Watchdog     - Ollama LLM / Vision
  - Flow Sensor              - MOSFET / Relay Driver     - JalRakshak Web UI (:5173)
                                      │
                                      ▼
                            [Submersible DC Pump]
                            (Isolated 5V/12V Power)
```

---

## Component Selection & Specifications

### 1. Microcontroller: ESP32 Dev Module
- **Model**: ESP32-WROOM-32 (30-pin or 38-pin DevKit v1)
- **Clock**: 240 MHz dual-core Tensilica Xtensa LX6
- **Wi-Fi**: 2.4 GHz 802.11 b/g/n
- **ADC**: 12-bit Successive Approximation Register (SAR) ADC.
  *Critical Note: Always use **ADC1 pins (GPIO 32–39)** for analog sensors. ADC2 is shared with the Wi-Fi subsystem and will return erratic readings when Wi-Fi is transmitting.*

### 2. Temperature & Humidity: DHT11 or DHT22
- **DHT11**: 0 to 50 °C (±2 °C), 20 to 90% RH (±5%). Sampling period: 1 Hz.
- **DHT22 (Recommended for outdoor terraces)**: -40 to 80 °C (±0.5 °C), 0 to 100% RH (±2%).
- **Connection**: Requires a 4.7 kΩ to 10 kΩ pull-up resistor between VCC and Data pin.

### 3. Soil Moisture: Capacitive Soil Moisture Sensor v1.2 / v2.0
- **Advantage over Resistive sensors**: No exposed copper traces in the soil. Uses capacitive frequency shift to measure dielectric permittivity. Does not corrode due to electrolysis.
- **Supply Voltage**: 3.3V (avoids exceeding ESP32 3.3V ADC input maximum).
- **Output**: Analog DC voltage (typically 1.2V in wet water, 3.0V in dry air).

### 4. Reservoir Water Level Sensor
- **Option A (Submersible resistive strip)**: Analog voltage proportional to water submersion depth.
- **Option B (Non-contact ultrasonic HC-SR04)**: Measures distance from tank lid to water surface.
- **Option C (Magnetic float switch)**: Digital dry contact opening when water reaches critical low level.

### 5. Actuator: Mini 5V or 12V DC Submersible Water Pump
- **Current draw**: 300 mA to 800 mA during pumping.
- **Switching mechanism**: Optocoupler-isolated 5V Relay module OR N-Channel Logic-Level MOSFET (e.g., IRLZ44N, FQP30N06L).
- **Protection**: 1N4007 flyback diode connected in reverse-parallel across pump leads.

### 6. Water Flow Sensor: YF-S201 (Optional)
- **Measurement**: Hall-effect pulse output (approx. 450 pulses per liter).
- **Working pressure**: < 1.75 MPa.
