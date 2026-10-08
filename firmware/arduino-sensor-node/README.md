# JalRakshak Garden AI — Arduino Sensor Node

This firmware enables an Arduino Uno, Nano, or Pro Mini to function as an auxiliary outdoor sensor node.

## Hardware Hookup to ESP32 Gateway
Connect:
- **Arduino TX (Pin 1)** ──> Voltage Divider (1kΩ / 2kΩ) ──> **ESP32 RX2 (GPIO 16)**
  *(Note: Arduino operates at 5V logic; ESP32 GPIO inputs are 3.3V. Use a resistor divider or level shifter on the TX line).*
- **Arduino GND** ──> **ESP32 GND** (Common ground is mandatory).

## Operating Principle
Every 5 seconds, the Arduino samples its analog inputs and transmits a structured JSON frame over UART at 115200 baud. The ESP32 gateway receives these frames and bundles them into the main FastAPI telemetry payload.
