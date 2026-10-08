"""JalRakshak Garden AI — Garden Digital Twin Subsystem.

Maintains live, continuously updated digital replicas of physical plants and garden zones:
- Environmental exposure (sunlight, soil type, ambient temp/humidity)
- Dynamic telemetry state (current moisture, target moisture bounds)
- Real-time physiological stress indicators (water stress, heat stress)
- Holistic plant health score (0–100)
- Historical resource usage (drying rate, last watered timestamp, cumulative liters)
"""
from __future__ import annotations

import datetime
from typing import Any, Optional

from database import get_db
import iot_learning
from plant_knowledge import lookup_plant_knowledge


def compute_plant_digital_twin(
    plant_id: int | str,
    device_id: Optional[str] = "esp32-garden-01",
    zone_id: Optional[str] = "zone-1",
) -> dict[str, Any]:
    """Generate the real-time Digital Twin state for a specific plant pot."""
    with get_db() as conn:
        plant_row = conn.execute(
            """SELECT id, name, species, soil_type, sunlight, container_type, age_months, location
            FROM plants WHERE id = ? OR name = ? LIMIT 1""",
            (plant_id, str(plant_id)),
        ).fetchone()

        # If plant not in database, fallback to canonical lookup
        species = plant_row["species"] if plant_row and plant_row["species"] else str(plant_id)
        plant_name = plant_row["name"] if plant_row else str(plant_id)
        soil_type = plant_row["soil_type"] if plant_row else "loamy"
        sunlight = plant_row["sunlight"] if plant_row else "full sun"
        pid_formatted = f"{species.lower()}-{plant_row['id']:03d}" if plant_row else f"{species.lower()}-001"

        # Latest soil moisture reading
        soil_row = conn.execute(
            """SELECT moisture_percent, timestamp FROM soil_readings
            WHERE device_id = ?
            ORDER BY timestamp DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

        # Latest ambient temperature reading
        temp_row = conn.execute(
            """SELECT value FROM sensor_readings
            WHERE device_id = ? AND sensor_type = 'temperature'
            ORDER BY timestamp DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

        # Last watering event
        pump_row = conn.execute(
            """SELECT timestamp, runtime_seconds, estimated_liters, measured_liters
            FROM pump_events
            WHERE device_id = ? AND action IN ('start', 'stop')
            ORDER BY timestamp DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

        # Cumulative water usage for this device/zone
        water_row = conn.execute(
            """SELECT SUM(COALESCE(measured_liters, estimated_liters, 0.0)) as total_liters
            FROM pump_events
            WHERE device_id = ? AND action IN ('stop', 'auto_timeout', 'emergency_stop')""",
            (device_id,),
        ).fetchone()

    current_moisture = float(soil_row["moisture_percent"]) if soil_row else 38.0
    current_temp = float(temp_row["value"]) if temp_row else 32.0
    last_watered = pump_row["timestamp"] if pump_row else "2026-10-07T06:30:00Z"
    total_water = round(float(water_row["total_liters"] or 0.0), 2)

    # Botanical knowledge bounds
    pk = lookup_plant_knowledge(species or plant_name)
    target_min = pk["soil_moisture_target_min"]
    target_max = pk["soil_moisture_target_max"]

    # Water stress calculation
    if current_moisture < (target_min * 0.7):
        water_stress = "high"
    elif current_moisture < target_min:
        water_stress = "moderate"
    elif current_moisture > (target_max * 1.15):
        water_stress = "overwatered"
    else:
        water_stress = "low"

    # Heat stress calculation
    if current_temp >= 38.0:
        heat_stress = "high"
    elif current_temp >= 33.0:
        heat_stress = "moderate"
    else:
        heat_stress = "low"

    # Health score (0 to 100)
    health = 100
    if water_stress == "high":
        health -= 25
    elif water_stress == "moderate":
        health -= 12
    elif water_stress == "overwatered":
        health -= 18

    if heat_stress == "high":
        health -= 15
    elif heat_stress == "moderate":
        health -= 5

    health = max(10, min(100, health))

    # Real-time drying rate
    drying_data = iot_learning.calculate_soil_drying_rate(device_id or "esp32-garden-01")
    drying_rate = drying_data.get("drying_rate_percent_per_hour", 2.2)

    # Approximate sunlight hours based on descriptor
    sunlight_hours = 7.0 if "full" in sunlight.lower() else (4.5 if "partial" in sunlight.lower() else 2.5)

    return {
        "plant_id": pid_formatted,
        "name": plant_name,
        "zone_id": zone_id or "zone-1",
        "device_id": device_id,
        "species": pk["canonical_name"],
        "name_gu": pk.get("name_gu", ""),
        "name_hi": pk.get("name_hi", ""),
        "soil_type": soil_type,
        "sunlight_hours": sunlight_hours,
        "current_moisture": round(current_moisture, 1),
        "target_moisture_min": target_min,
        "target_moisture_max": target_max,
        "health_score": health,
        "water_stress": water_stress,
        "heat_stress": heat_stress,
        "drying_rate": drying_rate,
        "last_watered": last_watered,
        "total_water_used_liters": total_water,
        "care_notes": pk.get("care_notes", ""),
        "water_depth": pk.get("water_depth", "5-8 cm"),
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


def compute_all_digital_twins() -> list[dict[str, Any]]:
    """Compute digital twins for all registered garden plants and mapped zones."""
    with get_db() as conn:
        plants = conn.execute("SELECT id, name, species, location FROM plants ORDER BY id ASC").fetchall()

    if not plants:
        # Default twins for demo/unseeded setup
        demo_specs = [
            ("Tomato (Tameta)", "Tomato", "esp32-garden-01", "zone-1"),
            ("Holy Basil (Tulsi)", "Tulsi", "esp32-garden-02", "zone-2"),
            ("Jasmine (Mogra)", "Mogra", "esp32-garden-03", "zone-3"),
        ]
        return [
            compute_plant_digital_twin(spec[1], device_id=spec[2], zone_id=spec[3])
            for spec in demo_specs
        ]

    twins = []
    for idx, p in enumerate(plants):
        dev = f"esp32-garden-0{(idx % 3) + 1}"
        z = f"zone-{(idx % 3) + 1}"
        twins.append(compute_plant_digital_twin(p["id"], device_id=dev, zone_id=z))
    return twins


def compute_zone_digital_twin(zone_id: str) -> dict[str, Any]:
    """Compute aggregated digital twin for an entire garden zone."""
    with get_db() as conn:
        zone_row = conn.execute(
            """SELECT zone_id, name, description, device_id, valve_channel, target_budget_weekly_liters
            FROM zones WHERE zone_id = ? LIMIT 1""",
            (zone_id,),
        ).fetchone()

    if not zone_row:
        return {
            "zone_id": zone_id,
            "name": f"Zone {zone_id}",
            "status": "not_configured",
        }

    dev_id = zone_row["device_id"] or "esp32-garden-01"
    all_twins = compute_all_digital_twins()
    zone_twins = [tw for tw in all_twins if tw.get("zone_id") == zone_id]

    avg_moisture = (
        round(sum(tw["current_moisture"] for tw in zone_twins) / len(zone_twins), 1)
        if zone_twins
        else 40.0
    )
    avg_health = (
        int(sum(tw["health_score"] for tw in zone_twins) / len(zone_twins))
        if zone_twins
        else 85
    )
    avg_drying = (
        round(sum(tw["drying_rate"] for tw in zone_twins) / len(zone_twins), 2)
        if zone_twins
        else 2.5
    )

    return {
        "zone_id": zone_id,
        "name": zone_row["name"],
        "description": zone_row["description"],
        "device_id": dev_id,
        "valve_channel": zone_row["valve_channel"],
        "target_budget_weekly_liters": zone_row["target_budget_weekly_liters"],
        "plant_count": len(zone_twins),
        "average_moisture": avg_moisture,
        "average_health_score": avg_health,
        "average_drying_rate": avg_drying,
        "plants": [tw["name"] for tw in zone_twins],
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
