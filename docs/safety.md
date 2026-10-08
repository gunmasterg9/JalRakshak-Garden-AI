# JalRakshak Garden AI — Actuator Safety System & Fail-Safe Specifications

Operating physical water pumps in home gardens presents genuine electrical and mechanical risks:
- Submersible pumps running dry will overheat and melt their plastic impellers.
- Water valves or relays sticking ON can flood residential balconies, damage building foundations, or waste hundreds of liters of municipal water.
- Sensor disconnection can cause blind automation algorithms to misjudge drought.

JalRakshak implements a **Defense-in-Depth Safety Architecture** spanning firmware, server, database, and UI.

---

## The 6 Safety Defense Layers

### 1. Reservoir Water Level Guard (Dry-Run Prevention)
- **Cutoff Threshold**: `MIN_WATER_LEVEL_PERCENT = 15.0%`.
- **Policy**: If tank level is $\le 15\%$, all pump commands (`PUMP_ON`) are rejected at both the FastAPI backend and in the ESP32 local firmware loop.
- **Fail-safe state**: PUMP OFF.

### 2. Maximum Runtime Guard (Flood Prevention)
- **Hard Limit**: `MAX_PUMP_RUNTIME = 60 seconds`.
- **Policy**: Even if the web dashboard or automation script requests indefinite running, the pump automatically cuts off power after 60 seconds.
- **Enforcement**: Dual-enforced in backend asynchronous scheduler and in local ESP32 firmware watchdog.

### 3. Actuator Cooldown Timer (Motor Burn-in Prevention)
- **Cooldown Duration**: `PUMP_COOLDOWN_SECONDS = 120 seconds`.
- **Policy**: Prevents rapid `ON → OFF → ON` thrashing cycles. After any watering cycle completes, the system locks out restart commands for 2 minutes.

### 4. Sensor Failure & Disconnection Fail-Safe
- **Rule**: If sensor readings are missing, stale, NaN, or out-of-range ($T < -20^\circ\text{C}$ or $T > 65^\circ\text{C}$), the fail-safe is always:
  $$\text{FAIL-SAFE} = \text{PUMP OFF}$$
- The system never assumes missing sensor data implies dry soil.

### 5. Server Disconnection Local Safety
- If the ESP32 loses Wi-Fi or server connection while pumping, the local ESP32 watchdog shuts the pump off when the local duration counter expires.
- If disconnected for over 15 minutes and soil reaches extreme wilt ($< 18\%$), the ESP32 allows a single, strictly metered 15-second survival hydration cycle, followed by mandatory cooldown.

### 6. Emergency Stop & Audit Trail
- A prominent red **"EMERGENCY STOP"** button is present on the Dashboard and IoT Devices page.
- Activating Emergency Stop immediately cuts the pump, engages a software lockout, and logs a permanent incident record to SQLite `pump_events` and `alerts`.
- The lockout persists until explicitly acknowledged and cleared by the user.
