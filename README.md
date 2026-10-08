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

1. **Smart Water Planner (Evaporation Guard)**
   - Computes conservative, evaporation-aware watering guidance based on soil type, pot vs. ground, sunlight, temperature, and recent rainfall.
   - Evaluates whether to water today, postpone, or check soil moisture first.
   - Transparent rules engine fallback ensures instant, reliable guidance even when AI is offline.

2. **AI Plant Doctor**
   - Image analysis powered by local open-weight vision models (e.g., `gemma4:12b`, `gemma3:4b`).
   - Returns structured diagnoses: observed symptoms vs. suspected causes, non-chemical remedies, watering tips, and prevention guidelines.
   - Never recommends dangerous chemical pesticides; distinguishes visible symptoms from tentative causes.

3. **My Garden (Full Plant Manager)**
   - Manage your plant collection in local SQLite.
   - Tracks species, planting date, soil type, sunlight, container type, age, notes, and watering history.
   - One-click watering logger and photo upload.
   - Pre-loaded regional crop presets (Tulsi, Tomato, Chilli, Okra, Coriander, Neem, Marigold, Mint, Curry Leaf, Lemon).

4. **Gujarat Gardening Mode**
   - Built specifically for hot, dry, and semi-arid climates.
   - Regional plant database with Gujarati (`ટામેટું`, `તુલસી`, `મરચું`, `ભીંડા`) and Hindi (`टमाटर`, `तुलसी`, `मिर्च`, `भिन्डी`) naming.
   - Heat-wave evaporation advice and organic mulching recommendations.
   - Celsius temperatures and Indian date formatting (`en-IN`).

5. **Garden Journal**
   - Chronological field journal for watering, fertilizer, growth updates, flowering, and pest observations.
   - Visual activity charts rendered with Recharts.

6. **Privacy-First & Local-First Architecture**
   - 100% of data is stored on your machine in local SQLite.
   - Zero telemetry, zero cloud tracking, and zero paid API keys.
   - Connects to local Ollama (`http://127.0.0.1:11434`).

---

## 💡 Why Open Innovation Matters for JalRakshak

| Dimension | Open-Weight / Local AI Approach | Closed Cloud AI (API) |
|---|---|---|
| **Outdoor / Offline Use** | Works completely offline in rural fields or backyard Wi-Fi dead zones | Fails the moment cellular or Wi-Fi signal drops |
| **Data Privacy** | Plant photos and terrace garden locations stay on local disk | Private backyard images uploaded to corporate servers |
| **Operating Cost** | **$0.00** forever (runs on consumer hardware) | Pay-per-token and pay-per-image subscription fees |
| **Model Flexibility** | Swap between `gemma4:12b`, `qwen3:8b`, `llama3.2`, or custom agricultural models | Locked into fixed proprietary API behavior |
| **Safety & Transparency** | Deterministic agronomic rules fallback prevents hallucinations | Closed models often hallucinate unsafe chemical doses |

## 🔌 Real-World IoT & Smart Actuator Architecture

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

- **ESP32 Firmware:** Non-blocking `millis()` loop in `firmware/esp32-garden-controller/` transmitting real telemetry to `POST /api/iot/telemetry`.
- **Arduino Auxiliary Sensor Node:** Serial streaming node in `firmware/arduino-sensor-node/`.
- **Defense-in-Depth Safety System:**
  - Reservoir cutoff at $\le 15\%$ water level (anti-dry run).
  - Maximum runtime watchdog (hard cutoff at 60s).
  - Cooldown timer (120s between runs).
  - Emergency Stop with software lockout.
  - Fail-safe state is always PUMP OFF.
- **Hardware Guides & Schematics:**
  - [Hardware Architecture & Specs](docs/hardware.md)
  - [Wiring & MOSFET / Relay Schematics](docs/wiring.md)
  - [ESP32 ADC Calibration Guide](docs/esp32.md)
  - [Actuator Safety & Fail-Safe Specifications](docs/safety.md)

---

## 🛠️ Technology Stack


- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, React Router, PWA Service Worker.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLite (WAL mode), HTTPX.
- **Local AI:** Ollama running open-weight models (`gemma4:12b`, `gemma3:4b`, `qwen3:8b`, `llama3.2`).
- **Tests:** Pytest, FastAPI TestClient.

---

## ⚡ Quick Start (Windows)

### Option A: One-Click Batch / PowerShell Scripts
- **Start the app:** Double-click [run.bat](file:///d:/Desktop/Challenge/JalRakshak-Garden-AI/run.bat) (or run `.\run.bat` / `.\start.ps1`)
- **Stop the app:** Double-click [stop.bat](file:///d:/Desktop/Challenge/JalRakshak-Garden-AI/stop.bat) (or run `.\stop.bat`)

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
ollama pull gemma4:12b
# or lightweight:
ollama pull gemma3:4b
```
*(If Ollama is not running, JalRakshak will automatically use its built-in rules engine without errors).*

---

## 🧪 Running Tests

### Backend Unit & Integration Tests (pytest)
```powershell
pytest backend/tests/test_api.py -v
```
All 20 tests verify plant CRUD lifecycle, journal referential integrity, daily outdoor missions, rules engine accuracy, Ollama connection checks, timeout fallbacks, and photo analysis error handling.

### Frontend Component Tests (Vitest)
```powershell
cd frontend
npm test
```
Verifies internationalization dictionary (English, Gujarati, Hindi), responsive UI components, and state management.

### Manual Photo Analysis & AI Doctor Testing
See the detailed step-by-step test guide: [manual_testing_photo_analysis.md](file:///d:/Desktop/Challenge/JalRakshak-Garden-AI/docs/manual_testing_photo_analysis.md)

---

## 📄 License
Open source under the MIT License. Designed for mindful growing.
