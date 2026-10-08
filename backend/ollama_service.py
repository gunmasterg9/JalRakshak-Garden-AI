"""JalRakshak Garden AI — Ollama integration service."""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

import config
from database import get_db

logger = logging.getLogger("jalrakshak.ollama")


def _get_model() -> str:
    """Return the active model name: settings override → env var → default."""
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT value FROM settings WHERE key = 'ollama_model'"
            ).fetchone()
            if row and row["value"]:
                return row["value"]
    except Exception:
        pass
    return config.OLLAMA_MODEL


async def check_connection() -> dict:
    """Check Ollama availability and list installed models."""
    result = {
        "ollama_available": False,
        "model": _get_model(),
        "model_installed": False,
        "installed_models": [],
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(1.5, connect=1.0)) as client:
            r = await client.get(f"{config.OLLAMA_URL}/api/tags")
            r.raise_for_status()
            models = [m.get("name", "") for m in r.json().get("models", [])]
            result["ollama_available"] = True
            result["installed_models"] = models
            model = result["model"]
            result["model_installed"] = any(
                m == model or m.startswith(model.split(":")[0] + ":")
                for m in models
            )
    except Exception as exc:
        logger.debug("Ollama connection check failed: %s", exc)
    return result


async def generate(
    prompt: str,
    images: Optional[list[str]] = None,
    model_override: Optional[str] = None,
) -> str:
    """Send a prompt to Ollama and return the response text.

    Raises httpx exceptions on connection or timeout failures.
    """
    model = model_override or _get_model()
    payload: dict = {"model": model, "prompt": prompt, "stream": False}
    if images:
        payload["images"] = images

    timeout = httpx.Timeout(config.AI_TIMEOUT, connect=3.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(f"{config.OLLAMA_URL}/api/generate", json=payload)
        r.raise_for_status()
        return r.json().get("response", "").strip()


async def generate_json(
    prompt: str,
    images: Optional[list[str]] = None,
    model_override: Optional[str] = None,
) -> Optional[dict]:
    """Call generate and attempt to parse JSON from the response.

    Returns None if parsing fails rather than raising.
    """
    raw = await generate(prompt, images, model_override)
    if not raw:
        return None
    # Try to extract JSON object from potentially wrapped response
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            pass
    # Also try array format
    start = raw.find("[")
    end = raw.rfind("]")
    if start >= 0 and end > start:
        try:
            return {"items": json.loads(raw[start : end + 1])}
        except json.JSONDecodeError:
            pass
    return None


def parse_diagnosis(raw_text: str) -> dict:
    """Parse AI diagnosis text into structured fields.

    Works even if the model returns plain text instead of JSON.
    """
    defaults = {
        "plant_identification": "",
        "observed_symptoms": "",
        "possible_causes": "",
        "confidence": "low",
        "recommended_actions": "",
        "watering_advice": "",
        "prevention_tips": "",
        "needs_expert_review": True,
        "raw_text": raw_text,
    }
    # Try JSON parse first
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(raw_text[start : end + 1])
            for key in defaults:
                if key in parsed:
                    defaults[key] = parsed[key]
            return defaults
        except json.JSONDecodeError:
            pass
    # Plain text fallback: use section headers
    sections = {
        "plant_identification": ["identification", "plant id", "what i notice", "identity"],
        "observed_symptoms": ["symptom", "observation", "what i see"],
        "possible_causes": ["cause", "diagnosis", "possible"],
        "recommended_actions": ["action", "recommendation", "treatment", "care check"],
        "watering_advice": ["water", "irrigation"],
        "prevention_tips": ["prevention", "prevent", "tip"],
        "confidence": ["confidence"],
    }
    lines = raw_text.split("\n")
    current_key = None
    for line in lines:
        lower = line.lower().strip("# *:-")
        for key, triggers in sections.items():
            if any(t in lower for t in triggers):
                current_key = key
                # Check if content is on the same line after colon
                if ":" in line:
                    content = line.split(":", 1)[1].strip()
                    if content:
                        defaults[key] = content
                break
        else:
            if current_key and line.strip():
                existing = defaults[current_key]
                if existing:
                    defaults[current_key] = existing + "\n" + line.strip()
                else:
                    defaults[current_key] = line.strip()
    return defaults
