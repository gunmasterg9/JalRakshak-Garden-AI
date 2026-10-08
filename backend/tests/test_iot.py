"""JalRakshak Garden AI — Comprehensive IoT & Hardware Safety Test Suite."""
import datetime
import pytest
from fastapi.testclient import TestClient

from main import app
from database import init_db, seed_defaults, get_db
import iot_safety

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    seed_defaults()
    iot_safety.clear_emergency_lock("esp32-garden-01")


def test_telemetry_valid_submission():
    payload = {
        "device_id": "esp32-garden-01",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "temperature_c": 31.4,
        "humidity_percent": 58.2,
        "soil_moisture_percent": 42.7,
        "water_level_percent": 76.0,
        "pump_on": False,
        "raw_adc": 2400,
        "is_simulated": False,
    }
    response = client.post("/api/iot/telemetry", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["device_id"] == "esp32-garden-01"
    assert data["is_simulated"] is False


def test_telemetry_rejection_impossible_temperature():
    payload = {
        "device_id": "esp32-garden-01",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "temperature_c": 95.0,  # Impossible outdoor terrace temperature
        "humidity_percent": 50.0,
        "soil_moisture_percent": 40.0,
        "water_level_percent": 80.0,
        "pump_on": False,
    }
    response = client.post("/api/iot/telemetry", json=payload)
    assert response.status_code == 422


def test_telemetry_rejection_impossible_humidity():
    payload = {
        "device_id": "esp32-garden-01",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "temperature_c": 30.0,
        "humidity_percent": 150.0,  # Invalid RH
        "soil_moisture_percent": 40.0,
        "water_level_percent": 80.0,
        "pump_on": False,
    }
    response = client.post("/api/iot/telemetry", json=payload)
    assert response.status_code == 422


def test_telemetry_rejection_malformed_timestamp():
    payload = {
        "device_id": "esp32-garden-01",
        "timestamp": "not-a-timestamp",
        "temperature_c": 30.0,
        "humidity_percent": 50.0,
        "soil_moisture_percent": 40.0,
        "water_level_percent": 80.0,
        "pump_on": False,
    }
    response = client.post("/api/iot/telemetry", json=payload)
    assert response.status_code == 422


def test_critical_low_water_guard_rejects_pump():
    # Submit telemetry with critical water level
    payload = {
        "device_id": "esp32-garden-01",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "temperature_c": 32.0,
        "humidity_percent": 45.0,
        "soil_moisture_percent": 22.0,
        "water_level_percent": 8.0,  # Below 15% minimum safety threshold
        "pump_on": False,
    }
    t_res = client.post("/api/iot/telemetry", json=payload)
    assert t_res.status_code == 201

    # Attempt to start pump when water tank is critical
    cmd_res = client.post(
        "/api/iot/devices/esp32-garden-01/command",
        json={"command": "PUMP_ON", "runtime_seconds": 30},
    )
    assert cmd_res.status_code == 400
    assert "critically low" in cmd_res.json()["detail"].lower()


def test_emergency_stop_and_lockout():
    # Trigger emergency stop
    res = client.post(
        "/api/iot/devices/esp32-garden-01/command",
        json={"command": "EMERGENCY_STOP"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "emergency_stop_engaged"

    # Subsequent pump activation must be refused due to lockout
    blocked_res = client.post(
        "/api/iot/devices/esp32-garden-01/command",
        json={"command": "PUMP_ON", "runtime_seconds": 15},
    )
    assert blocked_res.status_code == 400
    assert "lockout active" in blocked_res.json()["detail"].lower()

    # Clear emergency lockout
    clear_res = client.post(
        "/api/iot/devices/esp32-garden-01/command",
        json={"command": "CLEAR_EMERGENCY"},
    )
    assert clear_res.status_code == 200


def test_soil_calibration():
    res = client.post(
        "/api/iot/devices/esp32-garden-01/calibrate",
        json={"dry_value": 3250, "wet_value": 1380},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["dry_value"] == 3250
    assert data["wet_value"] == 1380
    assert data["status"] == "calibrated"


def test_iot_recommendation_and_explainability():
    # Submit normal telemetry
    payload = {
        "device_id": "esp32-garden-01",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "temperature_c": 33.5,
        "humidity_percent": 42.0,
        "soil_moisture_percent": 24.0,  # Below tomato critical low (25%)
        "water_level_percent": 85.0,
        "pump_on": False,
    }
    client.post("/api/iot/telemetry", json=payload)

    rec_res = client.get("/api/iot/recommendation?device_id=esp32-garden-01&plant_name=Tomato&use_ai=false")
    assert rec_res.status_code == 200
    rec = rec_res.json()
    assert rec["recommendation"] in ("WATER_NOW", "CHECK_SOIL")
    assert "why" in rec
    assert "evidence" in rec
    assert "confidence" in rec
    assert "action" in rec
    assert rec["evidence"]["soil_moisture"] == "24.0%"


def test_supported_plants_count():
    res = client.get("/api/iot/plants/supported")
    assert res.status_code == 200
    plants = res.json()
    assert len(plants) >= 16
    names = [p["canonical_name"].lower() for p in plants]
    assert any("tomato" in n for n in names)
    assert any("tulsi" in n for n in names)
    assert any("aloe vera" in n for n in names)
    assert any("neem" in n for n in names)


def test_analytics_and_savings_calculation():
    res = client.get("/api/iot/analytics?device_id=esp32-garden-01")
    assert res.status_code == 200
    data = res.json()
    assert "drying_rate" in data
    assert "watering_effectiveness" in data
    assert "water_savings" in data
    assert "water_saved_liters" in data["water_savings"]
    assert "measurement_type" in data["water_savings"]


def test_weather_endpoint():
    res = client.get("/api/iot/weather")
    assert res.status_code == 200
    data = res.json()
    assert "source" in data
    assert "current" in data
    assert "temperature_c" in data["current"]
    assert "humidity_percent" in data["current"]
    assert "rain_guard" in data
    assert "active" in data["rain_guard"]
    assert isinstance(data["rain_guard"]["active"], bool)


def test_export_readings_csv():
    res = client.get("/api/iot/export/readings.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "Timestamp,Device ID,Sensor Type,Value,Unit" in content


def test_export_pump_events_csv():
    res = client.get("/api/iot/export/pump_events.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "Timestamp,Device ID,Action,Trigger Source,Runtime Seconds" in content


def test_pending_proposals_endpoint():
    res = client.get("/api/iot/proposals/pending")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

