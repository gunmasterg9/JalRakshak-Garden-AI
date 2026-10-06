from __future__ import annotations
import base64
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("JALRAKSHAK_DB", str(BASE_DIR / "jalrakshak.db")))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
AI_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "90"))

app = FastAPI(title="JalRakshak Garden AI", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS journal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            plant TEXT NOT NULL,
            note TEXT NOT NULL,
            moisture TEXT,
            recommendation TEXT
        )
        """)
init_db()

class GardenInput(BaseModel):
    plant: str = "Tomato"
    location: str = "Gujarat, India"
    soil: str = "loamy"
    moisture: str = "slightly dry"
    weather: str = "hot and sunny"
    garden_size: str = "small"
    water_source: str = "tap / stored water"
    use_ai: bool = True

class JournalInput(BaseModel):
    plant: str = "General garden"
    note: str = Field(min_length=1, max_length=2000)
    moisture: str = "unknown"
    recommendation: str = ""

class PhotoInput(BaseModel):
    image_data_url: str
    plant_context: str = "Unknown plant"
    location: str = "Gujarat, India"

def rule_recommendation(g: GardenInput) -> dict:
    plant = g.plant.strip() or "your plant"
    moisture = g.moisture.lower()
    weather = g.weather.lower()
    soil = g.soil.lower()
    hot = any(x in weather for x in ["hot", "sunny", "heat", "dry"])
    very_dry = any(x in moisture for x in ["dry", "very dry"])
    wet = any(x in moisture for x in ["wet", "soggy", "waterlogged"])
    sandy = "sand" in soil
    clay = "clay" in soil

    if wet:
        action = "Pause watering for now and check that excess water can drain away."
        timing = "Recheck the top 2–3 cm of soil later today."
        amount = "Do not add water while the root zone is still wet."
    elif very_dry:
        action = "Water slowly at the base of the plant until the root zone is evenly moist, then let excess drain."
        timing = "Check again this evening; in hot weather, inspect soil daily rather than watering by the clock."
        amount = "Use a slow, deep watering instead of frequent shallow splashes."
    elif hot:
        action = "Check soil near the roots. If the top 2–3 cm is dry, water at the base in the early morning."
        timing = "Early morning is usually best; check again during a heatwave."
        amount = "Water according to soil moisture, pot size, and plant stage, not a fixed universal volume."
    else:
        action = "Check the top 2–3 cm of soil before watering. Water at the base only if it feels dry."
        timing = "Recheck tomorrow, or sooner if the weather becomes hot or windy."
        amount = "Aim for evenly moist soil with good drainage, not standing water."

    tips = [
        "Add a 3–5 cm layer of clean organic mulch where appropriate, keeping it away from the stem.",
        "Water the soil, not the leaves, to reduce evaporation and some leaf-disease risks.",
        "Group plants with similar water needs and check pots more often than in-ground beds.",
    ]
    if sandy:
        tips[0] = "Sandy soil drains quickly; use mulch and check moisture more frequently, while avoiding runoff."
    if clay:
        tips[0] = "Clay soil holds water longer; water slowly and confirm drainage before adding more."
    if "tomato" in plant.lower():
        tips.append("For tomatoes, keep moisture reasonably consistent to reduce stress and fruit cracking.")
    if "chilli" in plant.lower() or "pepper" in plant.lower():
        tips.append("For chilli/pepper plants, avoid leaving roots in waterlogged soil.")
    return {
        "title": f"Water-smart plan for {plant}",
        "summary": action,
        "timing": timing,
        "amount": amount,
        "checklist": tips,
        "watch_for": "Wilting can result from both dry soil and waterlogged roots. Check the soil before deciding to water.",
        "source": "offline rules",
        "confidence": "General guidance; verify conditions in your garden.",
    }

def ask_ollama(prompt: str, images: Optional[list[str]] = None) -> str:
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
    if images:
        payload["images"] = images
    response = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=AI_TIMEOUT)
    response.raise_for_status()
    return response.json().get("response", "").strip()

@app.get("/api/health")
def health():
    ollama_ok = False
    installed_models = []
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2.5)
        r.raise_for_status()
        ollama_ok = True
        installed_models = [m.get("name", "") for m in r.json().get("models", [])]
    except Exception:
        pass
    return {
        "ok": True,
        "ollama_available": ollama_ok,
        "model": OLLAMA_MODEL,
        "model_installed": any(m == OLLAMA_MODEL or m.startswith(OLLAMA_MODEL.split(":")[0] + ":") for m in installed_models),
        "installed_models": installed_models,
        "storage": "local SQLite",
    }

@app.post("/api/recommend")
def recommend(g: GardenInput):
    fallback = rule_recommendation(g)
    if not g.use_ai:
        return fallback
    prompt = f"""You are JalRakshak, a cautious water-smart gardening assistant for a home gardener in {g.location}.
Return valid JSON only with keys: title, summary, timing, amount, checklist (array of 3-5 short strings), watch_for.
Plant: {g.plant}; soil: {g.soil}; current moisture: {g.moisture}; weather: {g.weather}; garden size: {g.garden_size}; water source: {g.water_source}.
Give practical, conservative advice. Never invent a precise water volume without enough context. Ask the gardener to check actual soil moisture. Do not recommend pesticides or risky chemical treatments. Mention uncertainty where appropriate."""
    try:
        raw = ask_ollama(prompt)
        start, end = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[start:end + 1]) if start >= 0 and end > start else None
        if not isinstance(data, dict):
            raise ValueError("Model did not return JSON")
        data.setdefault("title", fallback["title"])
        data.setdefault("summary", fallback["summary"])
        data.setdefault("timing", fallback["timing"])
        data.setdefault("amount", fallback["amount"])
        data.setdefault("checklist", fallback["checklist"])
        data.setdefault("watch_for", fallback["watch_for"])
        data["source"] = f"local AI · {OLLAMA_MODEL}"
        data["confidence"] = "AI-generated guidance; check soil and plant condition before acting."
        return data
    except Exception:
        fallback["ai_note"] = "Local AI was unavailable or returned an unreadable response, so offline guidance is shown."
        return fallback

@app.post("/api/analyze-photo")
def analyze_photo(p: PhotoInput):
    if "," not in p.image_data_url:
        raise HTTPException(400, "Expected a data URL image.")
    mime_and_data = p.image_data_url.split(",", 1)
    mime = mime_and_data[0]
    if not mime.startswith("data:image/"):
        raise HTTPException(400, "Please upload an image.")
    encoded = mime_and_data[1]
    try:
        image_bytes = base64.b64decode(encoded)
    except Exception:
        raise HTTPException(400, "Image data could not be decoded.")
    if len(image_bytes) > 7 * 1024 * 1024:
        raise HTTPException(413, "Please use an image smaller than 7 MB.")
    try:
        prompt = f"""You are a cautious garden observation assistant. Context: {p.plant_context}. Region: {p.location}.
Describe visible features, possible plant identity if reasonably recognizable, and simple non-chemical care observations.
If uncertain, say so. Do not claim a definitive disease diagnosis and do not recommend pesticides.
Respond in concise plain text with headings: What I notice, Possible identification, Care checks, Confidence."""
        answer = ask_ollama(prompt, [encoded])
        if not answer:
            raise ValueError("Empty model response")
        return {"analysis": answer, "source": f"local vision AI · {OLLAMA_MODEL}", "note": "Visual suggestions can be wrong; verify before making care decisions."}
    except Exception as exc:
        raise HTTPException(503, f"Local vision AI unavailable. Check that Ollama is running and {OLLAMA_MODEL} is installed.")

@app.get("/api/journal")
def list_journal():
    with db() as conn:
        rows = conn.execute("SELECT * FROM journal ORDER BY id DESC LIMIT 100").fetchall()
    return [dict(row) for row in rows]

@app.post("/api/journal")
def create_journal(entry: JournalInput):
    created = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO journal (created_at, plant, note, moisture, recommendation) VALUES (?, ?, ?, ?, ?)",
            (created, entry.plant, entry.note, entry.moisture, entry.recommendation),
        )
        row = conn.execute("SELECT * FROM journal WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)
