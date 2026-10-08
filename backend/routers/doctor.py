"""JalRakshak — AI Plant Doctor (Photo & Symptom Diagnosis)."""
from __future__ import annotations

import base64
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

import config
from database import get_db
from models import PhotoAnalysisInput
import ollama_service
from rules_engine import symptom_assessment

router = APIRouter(prefix="/api/analyze-photo", tags=["doctor"])


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


@router.post("")
async def analyze_plant_photo(p: PhotoAnalysisInput):
    """Analyze a plant photo and/or described symptoms.
    
    Uses local open-weight vision model (via Ollama) when available,
    with automatic fallback to symptom-based offline rules if vision is unavailable or fails.
    """
    has_image = bool(p.image_data_url and "," in p.image_data_url)
    image_bytes = None
    encoded = None

    if has_image:
        mime_and_data = p.image_data_url.split(",", 1)
        mime = mime_and_data[0]
        if not mime.startswith("data:image/"):
            raise HTTPException(400, "Please upload a valid image (JPEG, PNG, WEBP).")
        encoded = mime_and_data[1]
        try:
            image_bytes = base64.b64decode(encoded)
        except Exception:
            raise HTTPException(400, "Image data could not be decoded.")
        
        if len(image_bytes) > config.MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise HTTPException(413, f"Image exceeds maximum size of {config.MAX_IMAGE_SIZE_MB} MB.")

    now = _now()
    active_model = ollama_service._get_model()

    # Rule-based fallback as baseline
    fallback = symptom_assessment(p.symptoms, p.plant_context)

    # If no image provided, return symptom-based rules assessment or run text-only Ollama
    if not has_image:
        if not p.symptoms.strip():
            raise HTTPException(400, "Please provide an image or describe the observed plant symptoms.")

        prompt = f"""You are JalRakshak Plant Doctor, a cautious botanical assistant.
The gardener reports these symptoms for plant '{p.plant_context}' in {p.location}:
Symptoms: {p.symptoms}

Return valid JSON with keys:
- plant_identification (string)
- observed_symptoms (string)
- possible_causes (string)
- confidence (string: 'low', 'medium', or 'tentative')
- recommended_actions (string)
- watering_advice (string)
- prevention_tips (string)
- needs_expert_review (boolean)

Rules:
1. Always state that this is a symptom-based evaluation without visual inspection.
2. Distinguish visible symptoms from suspected causes.
3. Suggest safe organic or cultural interventions (mulching, adjusting watering, checking drainage, manual pest picking).
4. NEVER recommend chemical pesticides or toxic treatments.
5. Set needs_expert_review to true if symptoms could indicate viral or severe bacterial disease.
"""
        try:
            ai_data = await ollama_service.generate_json(prompt)
            if ai_data and isinstance(ai_data, dict):
                ai_data["source"] = f"local AI (text) · {active_model}"
                _save_diagnosis(p.plant_id, "", p.symptoms, ai_data, ai_data["source"], now)
                return ai_data
        except Exception:
            pass

        fallback["source"] = "offline symptom rules"
        _save_diagnosis(p.plant_id, "", p.symptoms, fallback, fallback["source"], now)
        return fallback

    # We have an image — try vision analysis via Ollama
    prompt = f"""You are JalRakshak Plant Doctor, a cautious local-first garden health assistant.
Context: Plant is likely '{p.plant_context}'. Region: {p.location}.
Gardener symptoms note: {p.symptoms or 'None provided'}

Analyze this plant photo carefully. Return a valid JSON object with the following fields:
- plant_identification: Visible plant species or variety (note confidence or look-alikes).
- observed_symptoms: Clear, objective list of what is visible on leaves, stems, or soil.
- possible_causes: Realistic suspected reasons (underwatering, sun scorch, fungal, pest, nutrient).
- confidence: 'low', 'medium', or 'moderate' (never claim certainty from photo alone).
- recommended_actions: Practical, safe, non-chemical steps (prune affected leaf, check soil, mulch).
- watering_advice: Specific water recommendation based on what you see.
- prevention_tips: How to prevent recurrence naturally.
- needs_expert_review: boolean (true if potentially severe or ambiguous).

Safety rules:
- NEVER claim definitive certainty from a photo alone.
- NEVER recommend synthetic pesticides or dangerous chemicals.
- Emphasize checking soil moisture before applying remedies.
"""
    try:
        raw_text = await ollama_service.generate(prompt, images=[encoded])
        diagnosis = ollama_service.parse_diagnosis(raw_text)
        diagnosis["source"] = f"local vision AI · {active_model}"
        if not diagnosis.get("plant_identification"):
            diagnosis["plant_identification"] = p.plant_context or "Identified from photo"
        if not diagnosis.get("observed_symptoms"):
            diagnosis["observed_symptoms"] = p.symptoms or "Visual analysis completed"
        
        _save_diagnosis(p.plant_id, "", p.symptoms, diagnosis, diagnosis["source"], now)
        return diagnosis
    except Exception as exc:
        # Vision failed or model lacks vision capability -> fallback to symptom assessment with note
        fallback["source"] = "offline symptom rules (vision fallback)"
        fallback["vision_note"] = (
            f"Local model '{active_model}' could not process the image or vision is not supported on this model. "
            "Showing symptom-based safe guidance instead. You can change the model in Settings."
        )
        _save_diagnosis(p.plant_id, "", p.symptoms, fallback, fallback["source"], now)
        return fallback


def _save_diagnosis(plant_id, photo_path, symptoms, diagnosis_dict, source, now_str):
    """Persist diagnosis record to SQLite database."""
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO diagnoses
                   (plant_id, photo_path, symptoms, diagnosis_json, source, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (plant_id, photo_path, symptoms, json.dumps(diagnosis_dict), source, now_str),
            )
    except Exception:
        pass
