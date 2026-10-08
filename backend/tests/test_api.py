"""JalRakshak Garden AI — API, Logic, and Reliability Unit Tests."""
import base64
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

# Set up test environment
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Use temporary test database
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db.close()
os.environ["JALRAKSHAK_DB"] = temp_db.name

import config
import database
from main import app
from models import GardenInput
import ollama_service
from rules_engine import REGIONAL_PLANTS, _find_plant_info, rule_recommendation, symptom_assessment

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    database.init_db()
    database.seed_defaults()
    yield


# ---------------------------------------------------------------------------
# 1. Health & Connection Checks
# ---------------------------------------------------------------------------
def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "ollama_available" in data
    assert "storage" in data
    assert data["storage"] == "local SQLite"


@pytest.mark.asyncio
async def test_check_connection_offline():
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Connection refused")):
        info = await ollama_service.check_connection()
        assert info["ollama_available"] is False
        assert info["model_installed"] is False
        assert info["installed_models"] == []


@pytest.mark.asyncio
async def test_check_connection_online():
    mock_resp = httpx.Response(
        200,
        json={"models": [{"name": "gemma4:12b"}, {"name": "qwen3:8b"}]},
        request=httpx.Request("GET", "http://127.0.0.1:11434/api/tags"),
    )
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        info = await ollama_service.check_connection()
        assert info["ollama_available"] is True
        assert "gemma4:12b" in info["installed_models"]
        assert "qwen3:8b" in info["installed_models"]


# ---------------------------------------------------------------------------
# 2. Plant CRUD Operations & Validations
# ---------------------------------------------------------------------------
def test_plant_crud_lifecycle():
    # 1. Create plant
    payload = {
        "name": "Tulsi (Holy Basil)",
        "species": "Ocimum sanctum",
        "location": "Front Balcony",
        "planting_date": "2026-03-01",
        "soil_type": "loamy",
        "sunlight": "full sun",
        "container_type": "pot",
        "age_months": 2,
        "watering_preference": "low",
        "notes": "Sacred and medicinal plant",
    }
    create_res = client.post("/api/plants", json=payload)
    assert create_res.status_code == 201
    plant_data = create_res.json()
    plant_id = plant_data["id"]
    assert plant_data["name"] == "Tulsi (Holy Basil)"

    # 2. List plants
    list_res = client.get("/api/plants")
    assert list_res.status_code == 200
    plants = list_res.json()
    assert any(p["id"] == plant_id for p in plants)

    # 3. Filter plants by search
    filter_res = client.get("/api/plants?search=Tulsi")
    assert filter_res.status_code == 200
    assert len(filter_res.json()) >= 1

    # 4. Get plant details
    get_res = client.get(f"/api/plants/{plant_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Tulsi (Holy Basil)"
    assert "watering_history" in get_res.json()

    # 5. Log watering
    water_res = client.post(f"/api/plants/{plant_id}/water?amount_ml=250&method=base")
    assert water_res.status_code == 200

    # 6. Update plant
    update_res = client.put(f"/api/plants/{plant_id}", json={"age_months": 3})
    assert update_res.status_code == 200
    assert update_res.json()["age_months"] == 3

    # 7. Delete plant
    del_res = client.delete(f"/api/plants/{plant_id}")
    assert del_res.status_code == 204

    # 8. Confirm deletion
    get_after_del = client.get(f"/api/plants/{plant_id}")
    assert get_after_del.status_code == 404


def test_plant_validations_and_error_handling():
    # Empty name should fail validation (Pydantic min_length=1)
    res = client.post("/api/plants", json={"name": ""})
    assert res.status_code == 422

    # Get non-existent plant
    assert client.get("/api/plants/99999").status_code == 404

    # Update non-existent plant
    assert client.put("/api/plants/99999", json={"notes": "test"}).status_code == 404

    # Update with empty body
    assert client.put("/api/plants/1", json={}).status_code == 400

    # Delete non-existent plant
    assert client.delete("/api/plants/99999").status_code == 404

    # Water non-existent plant
    assert client.post("/api/plants/99999/water").status_code == 404


# ---------------------------------------------------------------------------
# 3. Journal Operations
# ---------------------------------------------------------------------------
def test_journal_crud():
    entry_payload = {
        "title": "Healthy New Shoots",
        "note": "Noticed 4 new leaves sprouting on the tomato plant. Soil is moderately moist.",
        "entry_type": "observation",
        "moisture": "moist",
        "recommendation": "Hold off watering today.",
    }
    create_res = client.post("/api/journal", json=entry_payload)
    assert create_res.status_code == 201
    assert create_res.json()["note"] == entry_payload["note"]

    list_res = client.get("/api/journal")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    stats_res = client.get("/api/journal/stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["total_entries"] >= 1


def test_journal_referential_integrity():
    # Non-existent plant_id should return 404
    entry_payload = {
        "plant_id": 99999,
        "note": "Orphan entry test",
    }
    res = client.post("/api/journal", json=entry_payload)
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# 4. Outdoor Missions & Badges
# ---------------------------------------------------------------------------
def test_missions_daily_and_completion():
    today_res = client.get("/api/missions/today")
    assert today_res.status_code == 200
    data = today_res.json()
    assert "mission" in data
    assert "streak" in data
    mission_id = data["mission"]["id"]

    # Complete today's mission
    comp_res = client.post(f"/api/missions/{mission_id}/complete", json={"notes": "Checked leaves thoroughly!"})
    assert comp_res.status_code in (200, 201)

    # Check badges
    badges_res = client.get("/api/missions/badges")
    assert badges_res.status_code == 200
    assert "badges" in badges_res.json()
    assert len(badges_res.json()["badges"]) >= 1


# ---------------------------------------------------------------------------
# 5. Recommendation Rules & Crop Intelligence
# ---------------------------------------------------------------------------
def test_rules_engine_dry_hot():
    g = GardenInput(
        plant="Tomato",
        location="Ahmedabad, Gujarat",
        soil="sandy",
        moisture="very dry",
        weather="hot and sunny",
        container_type="pot",
        use_ai=False,
    )
    rec = rule_recommendation(g)
    assert rec["water_today"] == "yes"
    assert "base" in rec["summary"].lower()
    assert any("mulch" in tip.lower() for tip in rec["checklist"])


def test_rules_engine_wet_soil():
    g = GardenInput(
        plant="Chilli",
        location="Rajkot, Gujarat",
        soil="clay",
        moisture="wet",
        weather="mild / cloudy",
        container_type="ground",
        use_ai=False,
    )
    rec = rule_recommendation(g)
    assert rec["water_today"] == "no"
    assert "pause" in rec["summary"].lower() or "drain" in rec["summary"].lower()


def test_regional_plants_lookup():
    # Verify regional crops database
    tulsi = _find_plant_info("Tulsi")
    assert tulsi is not None
    assert tulsi["water_need"] == "low"

    neem = _find_plant_info("Neem tree")
    assert neem is not None
    assert "drought" in neem["tip"].lower()

    marigold = _find_plant_info("Marigold")
    assert marigold is not None

    okra = _find_plant_info("Okra (Bhindi)")
    assert okra is not None


# ---------------------------------------------------------------------------
# 6. Recommendation API with Missing Ollama & Timeouts
# ---------------------------------------------------------------------------
def test_recommend_endpoint_offline_rule():
    payload = {
        "plant": "Coriander",
        "location": "Vadodara, Gujarat",
        "soil": "loamy",
        "moisture": "slightly dry",
        "weather": "hot and sunny",
        "container_type": "pot",
        "use_ai": False,
    }
    res = client.post("/api/recommend", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "offline rules"
    assert "water_today" in data


def test_recommend_endpoint_ai_connection_failure():
    # When use_ai=True but Ollama is offline or raises ConnectError
    payload = {
        "plant": "Neem",
        "location": "Gandhinagar, Gujarat",
        "soil": "sandy",
        "moisture": "dry",
        "weather": "sunny",
        "container_type": "ground",
        "use_ai": True,
    }
    with patch("ollama_service.generate_json", side_effect=httpx.ConnectError("Ollama connection failed")):
        res = client.post("/api/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "ai_note" in data
        assert "Using deterministic offline rules" in data["ai_note"]
        assert "water_today" in data


def test_recommend_endpoint_ai_timeout():
    # When use_ai=True and Ollama times out
    payload = {
        "plant": "Tomato",
        "location": "Gujarat",
        "soil": "loamy",
        "moisture": "dry",
        "weather": "hot",
        "container_type": "pot",
        "use_ai": True,
    }
    with patch("ollama_service.generate_json", side_effect=httpx.TimeoutException("AI timeout")):
        res = client.post("/api/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "ai_note" in data
        assert "Using deterministic offline rules" in data["ai_note"]


# ---------------------------------------------------------------------------
# 7. AI Plant Doctor & Photo Analysis Validation
# ---------------------------------------------------------------------------
def test_symptom_assessment_fallback():
    result = symptom_assessment("Leaves are turning yellow with brown spots", "Tomato")
    assert "possible_causes" in result
    assert "recommended_actions" in result
    assert result["needs_expert_review"] is True


def test_analyze_photo_validation_errors():
    # 1. Missing both image and symptoms
    res = client.post("/api/analyze-photo", json={"image_data_url": "", "symptoms": ""})
    assert res.status_code == 400

    # 2. Invalid MIME type
    invalid_mime = "data:text/plain;base64," + base64.b64encode(b"not an image").decode()
    res = client.post("/api/analyze-photo", json={"image_data_url": invalid_mime, "symptoms": "yellow leaves"})
    assert res.status_code == 400
    assert "valid image" in res.json()["detail"]

    # 3. Oversized image
    huge_bytes = b"0" * (config.MAX_IMAGE_SIZE_MB * 1024 * 1024 + 100)
    huge_data_url = "data:image/jpeg;base64," + base64.b64encode(huge_bytes).decode()
    res = client.post("/api/analyze-photo", json={"image_data_url": huge_data_url, "symptoms": "yellow leaves"})
    assert res.status_code == 413


def test_analyze_photo_symptoms_offline_rules():
    # Symptom-only diagnosis without image when AI is offline
    with patch("ollama_service.generate_json", side_effect=httpx.ConnectError("Offline")):
        res = client.post(
            "/api/analyze-photo",
            json={"image_data_url": "", "plant_context": "Chilli", "symptoms": "Leaves are curling with white mold underneath"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "offline symptom rules"
        assert "possible_causes" in data
        assert "recommended_actions" in data
        assert "watering_advice" in data


def test_analyze_photo_symptoms_ai_success():
    # Symptom-only diagnosis when AI model generates structured response
    mock_ai = {
        "plant_identification": "Chilli (Capsicum annuum)",
        "observed_symptoms": "Leaf curling and powdery mildew",
        "possible_causes": "Fungal infection aggravated by high humidity",
        "confidence": "moderate",
        "recommended_actions": "Improve airflow and remove lowest infected leaves",
        "watering_advice": "Water at soil level only",
        "prevention_tips": "Space plants and use organic mulch",
        "needs_expert_review": False,
    }
    with patch("ollama_service.generate_json", return_value=mock_ai):
        res = client.post(
            "/api/analyze-photo",
            json={"image_data_url": "", "plant_context": "Chilli", "symptoms": "Leaf curling with white spots"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "local AI" in data["source"]
        assert data["plant_identification"] == mock_ai["plant_identification"]


def test_analyze_photo_vision_fallback_on_unsupported_model():
    # When a model doesn't support vision or Ollama is offline
    dummy_img = "data:image/jpeg;base64," + base64.b64encode(b"fake image bytes").decode()
    with patch("ollama_service.generate", side_effect=httpx.HTTPError("Model does not support images")):
        res = client.post(
            "/api/analyze-photo",
            json={"image_data_url": dummy_img, "plant_context": "Tomato", "symptoms": "Dark brown spots on leaves"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "vision_note" in data
        assert "could not process the image" in data["vision_note"]
        assert data["source"] == "offline symptom rules (vision fallback)"


# ---------------------------------------------------------------------------
# 8. Settings Management
# ---------------------------------------------------------------------------
def test_settings_read_and_update():
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "settings" in data
    assert "suggested_models" in data

    put_res = client.put("/api/settings", json={"language": "gu", "region": "gujarat", "ollama_model": "qwen3:8b"})
    assert put_res.status_code == 200
    assert put_res.json()["settings"]["language"] == "gu"
    assert put_res.json()["settings"]["ollama_model"] == "qwen3:8b"
