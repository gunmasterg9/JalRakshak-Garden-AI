"""JalRakshak — Application Settings router."""
from __future__ import annotations

from fastapi import APIRouter

from database import get_db, seed_defaults
from models import SettingsUpdate
import ollama_service

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings():
    """Retrieve all current application settings alongside Ollama status."""
    seed_defaults()
    with get_db() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    
    settings_dict = {row["key"]: row["value"] for row in rows}
    
    # Check Ollama connection and installed models
    ollama_info = await ollama_service.check_connection()
    
    return {
        "settings": settings_dict,
        "ollama": ollama_info,
        "supported_languages": [
            {"code": "en", "name": "English"},
            {"code": "gu", "name": "ગુજરાતી (Gujarati)"},
            {"code": "hi", "name": "हिन्दी (Hindi)"},
        ],
        "suggested_models": [
            {"name": "gemma4:12b", "type": "Text + Vision (Recommended)"},
            {"name": "gemma3:4b", "type": "Lightweight Vision"},
            {"name": "qwen3:8b", "type": "Multilingual & Fast"},
            {"name": "llama3.2:latest", "type": "Lightweight Text & Vision"},
        ],
    }


@router.put("")
async def update_settings(updates: SettingsUpdate):
    """Update application settings."""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    with get_db() as conn:
        for k, v in update_data.items():
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (k, str(v)),
            )
    return await get_settings()
