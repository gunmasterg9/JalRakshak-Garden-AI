"""JalRakshak Garden AI — Test Suite for Advanced Intelligence & Garden Learning."""
import datetime
import pytest
from fastapi.testclient import TestClient

from main import app
from database import init_db, seed_defaults
import iot_safety
import garden_memory
import decision_learner

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    seed_defaults()
    iot_safety.clear_emergency_lock("esp32-garden-01")
    iot_safety._active_pump_sessions.clear()
    iot_safety._last_pump_stop_time.clear()


def test_garden_memory_crud():
    # Record event via Python API
    evt_id = garden_memory.record_memory_event(
        event_type="plant_observation",
        source="USER",
        plant_id="Tomato",
        zone_id="zone-1",
        data={"note": "Pruned lower yellow leaves, applied vermicompost mulch."},
    )
    assert evt_id > 0

    # Query via REST API
    res = client.get("/api/iot/memory?limit=10")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 1
    found = any(e["event_type"] == "plant_observation" for e in events)
    assert found is True

    # Record via REST API
    post_res = client.post(
        "/api/iot/memory",
        json={
            "event_type": "experiment_result",
            "source": "AI",
            "plant_id": "Tulsi",
            "zone_id": "zone-2",
            "data": {"finding": "Tulsi transpires 30% slower with 3cm neem wood chip mulch."},
        },
    )
    assert post_res.status_code == 201
    assert "event_id" in post_res.json()


def test_digital_twins_endpoints():
    res = client.get("/api/iot/digital-twins")
    assert res.status_code == 200
    twins = res.json()
    assert len(twins) >= 1

    first = twins[0]
    assert "plant_id" in first
    assert "species" in first
    assert "current_moisture" in first
    assert "target_moisture_min" in first
    assert "target_moisture_max" in first
    assert "health_score" in first
    assert "water_stress" in first
    assert "heat_stress" in first
    assert "drying_rate" in first
    assert 0 <= first["health_score"] <= 100

    # Single twin query
    single_res = client.get("/api/iot/digital-twins/Tomato")
    assert single_res.status_code == 200
    s_twin = single_res.json()
    assert s_twin["species"].lower() == "tomato"


def test_multi_zones_and_aggregation():
    res = client.get("/api/iot/zones")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) >= 3
    zone_ids = [z["zone_id"] for z in zones]
    assert "zone-1" in zone_ids
    assert "zone-2" in zone_ids
    assert "zone-3" in zone_ids

    # Zone aggregate twin
    z_res = client.get("/api/iot/zones/zone-1")
    assert z_res.status_code == 200
    z_data = z_res.json()
    assert "average_moisture" in z_data
    assert "average_health_score" in z_data
    assert "average_drying_rate" in z_data


def test_drying_curves_2_0_endpoint():
    res = client.get("/api/iot/drying-curves?device_id=esp32-garden-01&days=7")
    assert res.status_code == 200
    data = res.json()
    assert "condition_rates" in data
    rates = data["condition_rates"]
    assert "morning_drying_rate" in rates
    assert "afternoon_drying_rate" in rates
    assert "night_drying_rate" in rates
    assert "hot_day_drying_rate" in rates
    assert "humid_day_drying_rate" in rates
    assert "rainy_day_drying_rate" in rates
    # Afternoon drying rate is higher than night drying rate
    assert rates["afternoon_drying_rate"] >= rates["night_drying_rate"]


def test_predictive_watering_endpoint():
    res = client.get("/api/iot/predictive-watering?device_id=esp32-garden-01&plant_name=Tomato")
    assert res.status_code == 200
    pred = res.json()
    assert "status" in pred
    assert "prediction_confidence" in pred
    assert "recommended_watering_window" in pred


def test_adaptive_watering_duration_endpoint():
    res = client.get("/api/iot/adaptive-duration?device_id=esp32-garden-01&plant_name=Tomato&current_moisture=22.0")
    assert res.status_code == 200
    adap = res.json()
    assert "recommended_duration_seconds" in adap
    assert "estimated_liters_delivered" in adap
    assert "hardware_max_safety_limit" in adap
    # Must be safely clamped between 10s and 60s
    assert 10 <= adap["recommended_duration_seconds"] <= 60


def test_flow_sensor_intelligence_endpoint():
    res = client.get("/api/iot/flow-intelligence?device_id=esp32-garden-01&days=30")
    assert res.status_code == 200
    data = res.json()
    assert "primary_source" in data
    assert data["primary_source"] in ("MEASURED", "ESTIMATED", "UNKNOWN")
    assert "average_liters_per_watering" in data
    assert "daily_average_liters" in data


def test_water_budget_lifecycle():
    res = client.get("/api/iot/water-budget")
    assert res.status_code == 200
    budget = res.json()
    assert "target_liters" in budget
    assert "consumed_liters" in budget
    assert "remaining_liters" in budget
    assert "status" in budget
    assert budget["status"] in ("NORMAL", "WATCH", "OVER_BUDGET")

    # Update budget
    post_res = client.post(
        "/api/iot/water-budget",
        json={"target_liters": 100.0, "period_type": "weekly", "warning_threshold_percent": 85.0},
    )
    assert post_res.status_code == 200
    assert post_res.json()["target_liters"] == 100.0


def test_microclimate_map_endpoint():
    res = client.get("/api/iot/microclimate")
    assert res.status_code == 200
    climate = res.json()
    assert "nodes" in climate
    assert len(climate["nodes"]) >= 3
    assert "temperature_divergence_c" in climate
    assert "humidity_divergence_percent" in climate
    assert "hotspot_zone" in climate
    assert "sheltered_zone" in climate


def test_decision_learning_and_proposal_hook():
    # Submit a proposal action
    res = client.post("/api/iot/proposals/prop-tomato-01/action?approve=true")
    # It either approves and issues command or returns 404 if already acted on
    assert res.status_code in (200, 404)

    # Directly test decision learner recording
    outcome_id = decision_learner.record_user_decision(
        proposal_id="test-prop-02",
        decision="dismissed",
        plant_name="Chilli",
        zone_id="zone-1",
        device_id="esp32-garden-01",
        initial_moisture=32.0,
        recommended_runtime=20,
    )
    assert outcome_id > 0

    # Query insights
    insights_res = client.get("/api/iot/feedback/insights?plant_name=Chilli")
    assert insights_res.status_code == 200
    assert "insights" in insights_res.json()
