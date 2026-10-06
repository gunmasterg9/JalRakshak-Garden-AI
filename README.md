# JalRakshak Garden AI 🌱
A local-first, responsive gardening assistant MVP focused on water-smart gardening for hot and dry climates.

## What works in this MVP
- Responsive dashboard with a polished garden-focused interface.
- Garden profile and plant/soil/weather inputs.
- Practical watering and care recommendations with a deterministic offline fallback.
- Optional local AI advice through Ollama (`gemma3:4b` by default).
- Plant photo upload and optional local vision analysis through Ollama.
- Local SQLite journal for observations and recommendations.
- API health/model status endpoint.
- Basic PWA shell caching so the frontend can reopen offline after its first load. AI analysis requires the local backend and model; the rule-based guidance still works without AI.
- No account, analytics, or cloud AI API is required.

## Architecture
- Frontend: React + Vite
- Backend: FastAPI + SQLite
- Local AI: Ollama with `gemma3:4b` (vision-capable, useful for text and plant-image questions)
- Offline fallback: local rule-based recommendation engine

**Privacy note:** Images are sent only to the Ollama service configured on your own machine. They are not uploaded to a hosted AI provider by this app. Keep the Ollama endpoint local unless you intentionally configure otherwise.

## Requirements
- Python 3.10+
- Node.js 20+
- Optional: Ollama for local AI
- Recommended local model: `gemma3:4b`. On a machine with a 16 GB GPU, this is a reasonable starting point; larger models may use more VRAM and run slower.

## Run on Windows

### 1. Install Ollama (optional, for AI)
Install Ollama from https://ollama.com/download, then open PowerShell:

```powershell
ollama pull gemma3:4b
ollama run gemma3:4b
```

You can stop the interactive prompt after the model has downloaded. Keep Ollama running in the background.

If you want to test the model:
```powershell
ollama run gemma3:4b "Give me three water-saving tips for a small vegetable garden in Gujarat."
```

### 2. Start the backend
Open PowerShell in the `backend` folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks activation, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Backend API: http://127.0.0.1:8000  
API docs: http://127.0.0.1:8000/docs

### 3. Start the frontend
Open a second PowerShell window in `frontend`:

```powershell
npm install
npm run dev
```

Open the local URL Vite prints, usually http://localhost:5173.

## Offline behavior
- After the frontend is loaded once, the PWA service worker caches the app shell.
- If the backend is unavailable, the frontend provides local fallback recommendations.
- Local AI and saved journal entries require the backend to be running.
- For a fully offline field trip, start the backend and Ollama before leaving Wi-Fi range, and confirm the model has downloaded.
- Browser camera/photo permissions and installed-PWA behavior vary by browser.

## API endpoints
- `GET /api/health` — backend and Ollama status
- `POST /api/recommend` — garden recommendation; uses local AI if enabled, otherwise rules
- `POST /api/analyze-photo` — local vision analysis (requires Ollama)
- `GET /api/journal` — list local journal entries
- `POST /api/journal` — save an entry locally

## Model selection
Default: `gemma3:4b`. To change it, set environment variable `OLLAMA_MODEL` before starting the backend.

PowerShell:
```powershell
$env:OLLAMA_MODEL="qwen2.5vl:7b"
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Use a model that supports image input if you want photo analysis. Model names and availability depend on the Ollama version and your installed models.

## MVP limitations
- Watering advice is a starting point, not a substitute for checking actual soil moisture and local agricultural guidance.
- The model may be wrong about plant species or diseases. Do not use photo analysis alone to make pesticide or food-safety decisions.
- Weather inputs are entered manually; no live weather service is called.
- Offline frontend caching does not make every browser feature or the backend itself installable automatically.

## Suggested demo
1. Open the app and select a crop/plant.
2. Set soil to sandy, weather to hot, and soil moisture to dry.
3. Generate a watering plan and explain how the fallback still works with Ollama stopped.
4. Turn on Ollama and ask for a more tailored plan.
5. Upload a plant photo for local AI observations.
6. Save a garden journal entry.
7. Briefly show that the app is running locally and does not need a hosted AI API.
