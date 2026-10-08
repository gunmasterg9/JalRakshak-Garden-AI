# JalRakshak Garden AI 🌱

> **Theme: Touch Grass — Step away from the screen, conserve water, and grow thriving plants with local-first, open-weight AI.**

**JalRakshak Garden AI** (જળરક્ષક ગાર્ડન એઆઈ / जलक्षक गार्डन एआई) is a privacy-first, water-smart gardening assistant built around open-weight models. It helps people grow healthy plants, reduce water consumption by up to 40%, diagnose plant health issues, and spend more mindful time outdoors with their hands in the soil.

---

## 🌿 Why "Touch Grass"?

Gardening apps too often trap people behind infinite feeds, ads, and battery-draining cloud services. **JalRakshak inverts this relationship:**

- **The screen is the shortest part:** Check your garden in 60 seconds, get an evaporation-aware watering recommendation, and head outside.
- **Daily Outdoor Missions:** Practical, screen-free gardening challenges (inspecting leaf undersides, touching soil moisture, adding mulch, observing pollinators, collecting rainwater).
- **Positive, Gentle Habits:** Streak counter and achievement badges with zero manipulative or guilt-based dark patterns.

---

## 🚀 Key Features

1. **Garden Digital Twin & Multi-Zone Management**
   - Live virtual replicas for plants and zones (`/twin`): health score (0–100), water stress, heat stress, soil moisture vs. botanical targets, and cumulative water usage.
   - Microclimate divergence mapping across multiple ESP32 nodes (Terrace East, Terrace West, Shaded Balcony).

2. **Predictive Watering & Adaptive Runtime Learning**
   - Forecasts when soil will cross critical wilt thresholds (`hours_until_critical` and exact critical timestamp).
   - Recommends non-evaporative watering windows (e.g., 06:00–07:30 AM).
   - Learns empirical soil recovery rates per second of pump runtime, automatically calculating adaptive irrigation durations.

3. **Persistent Garden Memory Subsystem**
   - 72-hour immutable event timeline across 5 sources: `SENSOR`, `USER`, `AI`, `SYSTEM`, `WEATHER`.
   - Injects chronological garden memory directly into Ollama AI prompts for contextual recommendations.
   - Evaluates user approvals vs. dismissals after 12h to continuously refine threshold sensitivity.

4. **Weather Intelligence & "Rain Guard"**
   - Keyless Open-Meteo 24-hour precipitation forecast integration.
   - Automatically pauses automated irrigation when $\ge 2.0\,\text{mm}$ or $\ge 60\%$ precipitation is expected.

5. **Real-Time WebSockets & Raw CSV Exports**
   - Real-time event streaming (`/api/iot/ws`) for zero-latency gauge updates and pump state transitions.
   - 1-click CSV streaming downloads for raw sensor telemetry (`/api/iot/export/readings.csv`) and pump audit history (`/api/iot/export/pump_events.csv`).

6. **Conservation Water Budget Tracker**
   - Real-time weekly water target tracking with `NORMAL`, `WATCH`, and `OVER_BUDGET` status badges.
   - Flow meter intelligence categorizing consumption as `MEASURED` (YF-S201 pulses) vs `ESTIMATED`.

7. **Smart Water Planner & 6-Layer Hardware Watchdog**
   - Defense-in-depth safety: reservoir cutoff $\le 15\%$, runtime cap 60s, thermal cooldown 120s, sticky emergency stop, fail-safe off.
   - AI NEVER directly controls actuators; human-in-the-loop semi-automatic proposal approvals.

8. **AI Plant Doctor & Gujarat Climate Mode**
   - Vision diagnoses via local open-weight models (`gemma4`, `llama3.2-vision`) with non-chemical remedies.
   - Regional crop database with Gujarati (`ટામેટું`, `તુલસી`, `મરચું`, `ભીંડા`) and Hindi naming.

---

## 💡 Why Open Innovation Matters for JalRakshak

| Dimension | Open-Weight / Local AI Approach | Closed Cloud AI (API) |
|---|---|---|
| **Outdoor / Offline Use** | Works completely offline in rural fields or backyard Wi-Fi dead zones | Fails the moment cellular or Wi-Fi signal drops |
| **Data Privacy** | Plant photos and terrace garden locations stay on local disk | Private backyard images uploaded to corporate servers |
| **Operating Cost** | **$0.00** forever (runs on consumer hardware) | Pay-per-token and pay-per-image subscription fees |
| **Model Flexibility** | Swap between `gemma4:12b`, `qwen2.5`, `llama3.2`, or custom agricultural models | Locked into fixed proprietary API behavior |
| **Safety & Transparency** | Deterministic agronomic rules fallback prevents hallucinations | Closed models often hallucinate unsafe chemical doses |

## 🔌 Advanced Edge-to-Local Intelligence Architecture

```text
                    REAL GARDEN
                         │
              ┌──────────┼──────────┐
              ↓          ↓          ↓
           ESP32 #1   ESP32 #2   ESP32-CAM
        (Terrace East) (Terrace West) (Shade Area)
              │          │          │
              └──────────┼──────────┘
                         ↓
                  IoT Gateway
                    FastAPI (:8000)
                         ↓
                 Sensor History (SQLite WAL)
                         ↓
              ┌──────────┼──────────┐
              ↓          ↓          ↓
        Rules Engine  Learning    Weather (Open-Meteo)
              │          │          │
              └──────────┼──────────┘
                         ↓
                  Garden Memory
                         ↓
                  Local Ollama
                         ↓
                AI Reasoning Layer
                         ↓
                Safety Decision Layer  (6-Layer Watchdog: AI NEVER directly controls hardware)
                         ↓
               Pump / Valve Control
                         ↓
                 Real Garden Result
                         ↓
                    Learning Loop
```

- **ESP32 Firmware:** Non-blocking `millis()` loop in [`firmware/esp32-garden-controller/`](firmware/esp32-garden-controller) transmitting real telemetry to `POST /api/iot/telemetry`.
- **Arduino Sensor Node:** Serial streaming node in [`firmware/arduino-sensor-node/`](firmware/arduino-sensor-node).
- **Hardware Guides & Schematics:**
  - [Comprehensive Project Report](docs/PROJECT_REPORT.md)
  - [Hardware Architecture & Specs](docs/hardware.md)
  - [Wiring & MOSFET / Relay Schematics](docs/wiring.md)
  - [ESP32 ADC Calibration Guide](docs/esp32.md)
  - [Actuator Safety & Fail-Safe Specifications](docs/safety.md)

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, React Router.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLite (WAL mode), WebSockets, HTTPX.
- **Local AI:** Ollama running open-weight models (`qwen2.5`, `gemma4:12b`, `llama3.2-vision`).
- **Tests:** Pytest (44 tests passing 100%), Vitest.

---

## ⚡ Quick Start (Windows)

### Option A: One-Click Batch / PowerShell Scripts
- **Start the app:** Double-click [`run.bat`](run.bat) (or run `.\run.bat` / `.\start.ps1`)
- **Stop the app:** Double-click [`stop.bat`](stop.bat) (or run `.\stop.bat`)

The launcher checks Ollama status, starts the FastAPI backend (port 8000), launches the React frontend (port 5173), and automatically opens `http://localhost:5173`.

---

### Option B: Manual Setup

#### 1. Setup Backend
Open a PowerShell window:
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be live at: `http://127.0.0.1:8000`  
Swagger UI documentation: `http://127.0.0.1:8000/docs`

#### 2. Setup Frontend
Open a second PowerShell window:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

#### 3. Optional: Connect Local Ollama
If you wish to use open-weight AI for diagnosis and advice:
```powershell
# Install Ollama from https://ollama.com
ollama pull qwen2.5:7b
# or lightweight:
ollama pull gemma3:4b
```
*(If Ollama is not running, JalRakshak will automatically use its built-in rules engine without errors).*

---

## 🧪 Running Tests

### Backend Unit & Integration Tests (pytest)
```powershell
python -m pytest backend/tests -v
```
**44 tests passing 100%:** Covers plant CRUD, missions, botanical rules, 6-layer hardware safety watchdog, soil ADC calibration, emergency stops, Open-Meteo Rain Guard, CSV exports, Digital Twins, multi-zones, Drying Curve 2.0, predictive critical wilt forecasting, adaptive watering duration, flow sensor classification, water budgeting, microclimate divergence, and decision learning feedback.

### Frontend Component Tests (Vitest)
```powershell
cd frontend
npm test -- --run
```
Verifies internationalization dictionary (English, Gujarati, Hindi), responsive UI components, and state management.

### Production Build Verification
```powershell
cd frontend
npm run build
```

---

## 📄 License
Open source under the MIT License. Designed for mindful growing.
