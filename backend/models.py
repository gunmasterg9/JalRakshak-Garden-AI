"""JalRakshak Garden AI — Pydantic models."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Plants
# ---------------------------------------------------------------------------
class PlantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    species: str = ""
    location: str = ""
    planting_date: str = ""
    soil_type: str = "loamy"
    sunlight: str = "full sun"
    container_type: str = "ground"
    age_months: int = 0
    watering_preference: str = "moderate"
    notes: str = ""


class PlantUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    location: Optional[str] = None
    planting_date: Optional[str] = None
    soil_type: Optional[str] = None
    sunlight: Optional[str] = None
    container_type: Optional[str] = None
    age_months: Optional[int] = None
    watering_preference: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Garden recommendation
# ---------------------------------------------------------------------------
class GardenInput(BaseModel):
    plant: str = "Tomato"
    location: str = "Gujarat, India"
    soil: str = "loamy"
    moisture: str = "slightly dry"
    weather: str = "hot and sunny"
    garden_size: str = "small"
    water_source: str = "tap / stored water"
    sunlight: str = "full sun"
    container_type: str = "ground"
    recent_rainfall: str = ""
    temperature: str = ""
    use_ai: bool = True


# ---------------------------------------------------------------------------
# Journal
# ---------------------------------------------------------------------------
class JournalCreate(BaseModel):
    plant_id: Optional[int] = None
    entry_type: str = "note"
    title: str = ""
    note: str = Field(min_length=1, max_length=4000)
    moisture: str = ""
    recommendation: str = ""


# ---------------------------------------------------------------------------
# Photo analysis (Plant Doctor)
# ---------------------------------------------------------------------------
class PhotoAnalysisInput(BaseModel):
    image_data_url: str
    plant_id: Optional[int] = None
    plant_context: str = "Unknown plant"
    location: str = "Gujarat, India"
    symptoms: str = ""


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
class SettingsUpdate(BaseModel):
    language: Optional[str] = None
    region: Optional[str] = None
    temperature_unit: Optional[str] = None
    date_format: Optional[str] = None
    ollama_model: Optional[str] = None
    theme: Optional[str] = None


# ---------------------------------------------------------------------------
# Mission completion
# ---------------------------------------------------------------------------
class MissionComplete(BaseModel):
    notes: str = ""


# ---------------------------------------------------------------------------
# Watering log
# ---------------------------------------------------------------------------
class WateringLogCreate(BaseModel):
    plant_id: int
    amount_ml: int = 0
    method: str = ""
    notes: str = ""
