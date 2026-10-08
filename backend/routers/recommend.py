"""JalRakshak — Smart Water Planner & Recommendations router."""
from __future__ import annotations

import json
from fastapi import APIRouter

from models import GardenInput
from rules_engine import rule_recommendation
import ollama_service

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


@router.post("")
async def generate_recommendation(g: GardenInput):
    """Generate water-smart gardening recommendation.
    
    Uses local Ollama open-weight AI model if enabled, with immediate fallback
    to deterministic rule-based engine when AI is offline or times out.
    """
    fallback = rule_recommendation(g)
    if not g.use_ai:
        return fallback

    prompt = f"""You are JalRakshak, a cautious water-smart gardening assistant for a gardener in {g.location}.
Return valid JSON only with keys:
- title (string): short title
- summary (string): primary action to take (e.g. water now, postpone, check soil)
- timing (string): best time of day
- amount (string): conservative guideline, accounting for container or ground
- water_today (string: 'yes', 'no', or 'check')
- suggested_time (string)
- checklist (array of 3-5 practical strings, e.g. mulching, soil checks)
- watch_for (string): signs of overwatering or drought stress
- explanation (string): concise reason behind the advice

Context:
Plant: {g.plant}
Soil: {g.soil}
Current soil moisture: {g.moisture}
Weather: {g.weather}
Sunlight: {g.sunlight}
Planting container: {g.container_type}
Garden size: {g.garden_size}
Water source: {g.water_source}
Recent rainfall: {g.recent_rainfall or 'None recorded'}
Temperature: {g.temperature or 'Unspecified'}

Rules:
1. Cautious & water-conservative.
2. Never invent a precise water quantity (e.g. 'exact 2.3 liters') without soil sensor data.
3. Account for potted plants versus ground beds.
4. If temperature is high (>35°C or hot/sunny), emphasize early morning watering and mulch.
5. Do NOT recommend chemical pesticides.
"""
    try:
        data = await ollama_service.generate_json(prompt)
        if not data or not isinstance(data, dict):
            fallback["ai_note"] = "Local AI output was not structured JSON. Using transparent offline rules."
            return fallback

        # Populate defaults from fallback
        data.setdefault("title", fallback["title"])
        data.setdefault("summary", fallback["summary"])
        data.setdefault("timing", fallback["timing"])
        data.setdefault("amount", fallback["amount"])
        data.setdefault("water_today", fallback["water_today"])
        data.setdefault("suggested_time", fallback["suggested_time"])
        data.setdefault("checklist", fallback["checklist"])
        data.setdefault("watch_for", fallback["watch_for"])
        data.setdefault("explanation", fallback.get("explanation", ""))
        
        active_model = ollama_service._get_model()
        data["source"] = f"local AI · {active_model}"
        data["confidence"] = "Local open-weight AI recommendation; verify soil moisture before watering."
        return data
    except Exception as exc:
        fallback["ai_note"] = f"Local AI unavailable ({type(exc).__name__}). Using deterministic offline rules."
        return fallback
