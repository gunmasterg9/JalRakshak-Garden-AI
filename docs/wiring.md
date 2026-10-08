# JalRakshak Garden AI — Electrical Wiring & Pinout Guide

## ⚠️ Critical Electrical Warning
**NEVER connect the water pump directly to an ESP32 GPIO pin.**
ESP32 GPIO pins can safely source/sink a maximum of **12 mA to 20 mA**. A mini DC water pump draws between **300 mA and 1000 mA (1 Amp)**, with startup inrush currents up to 2 Amps. Connecting a pump directly to an ESP32 GPIO will instantly permanently destroy the microcontroller chip.

Always use an electrically rated switching interface:
- **5V Optocoupler Relay Module**, OR
- **Logic-Level N-Channel MOSFET** (e.g., IRLZ44N, IRLB8721).

---

## 1. Complete Pinout Table

| Sensor / Module | Sensor Pin | ESP32 GPIO Pin | Power Rail | Extra Components Required |
|---|---|---|---|---|
| **DHT11 / DHT22** | Data | `GPIO 4` | 3.3V / 5V | 10 kΩ pull-up resistor (VCC to Data) |
| **Capacitive Soil** | AOUT | `GPIO 34` (ADC1_CH6) | 3.3V | None |
| **Water Level Sensor** | Signal | `GPIO 35` (ADC1_CH7) | 3.3V | None |
| **Pump Driver (MOSFET/Relay)** | IN / Gate | `GPIO 16` | 3.3V | 10 kΩ pull-down resistor (Gate to GND) |
| **Flow Sensor (YF-S201)** | Signal | `GPIO 14` | 5V | 4.7 kΩ pull-up resistor to 3.3V |
| **Status LED** | Anode (+) | `GPIO 2` | 3.3V | Internal or 330Ω in series |
| **Common Ground** | GND | `GND` | Ground | Tie ESP32 GND and Pump Power GND together |

---

## 2. Wiring Schematics

### A. Isolated Relay Module Configuration (Recommended for Beginners)
```text
           +5V External Power Adapter
                │
                ├───> Relay VCC
                │
                ├───> Relay COM Terminal
                │        │
                │        ▼
                │     [Relay Contact NO] ────> (+) DC Pump Terminal
                │                                    │
                │                              [1N4007 Diode] (Cathode to +, Anode to -)
                │                                    │
           GND ─┴───> Relay GND ─────────────> (-) DC Pump Terminal
                │
                │
   ESP32 GND ───┴─── (Tie grounds together if relay lacks opto-isolation)
   ESP32 GPIO 16 ───> Relay IN Terminal
```

### B. Logic-Level N-Channel MOSFET Configuration (IRLZ44N)
```text
   ESP32 GPIO 16 ──────[ 220Ω Resistor ]──────> Gate (Pin 1)
                              │
                        [ 10kΩ Pull-Down ]
                              │
   ESP32 GND ─────────────────┴───────────────> Source (Pin 3)
                                                     │
   External 5V/12V GND ──────────────────────────────┘

   External 5V/12V (+) ───────────────────────> (+) DC Pump Terminal
                                                     │
                                               [1N4007 Diode] (Cathode to +, Anode to -)
                                                     │
   MOSFET Drain (Pin 2) ──────────────────────> (-) DC Pump Terminal
```

---

## 3. Inductive Flyback Protection (1N4007 Diode)
When a DC motor abruptly turns OFF, its electromagnetic coil collapses, generating a high-voltage reverse voltage spike (often 50V to 100V+).
- Solder a standard **1N4007 diode directly across the (+) and (-) terminals of the pump motor**.
- The silver stripe (Cathode) connects to the **positive (+)** terminal.
- The black body (Anode) connects to the **negative (-)** terminal.
This safely recirculates and dissipates the inductive flyback energy without damaging the MOSFET or microcontroller.
