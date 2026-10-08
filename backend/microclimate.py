"""JalRakshak Garden AI — Multi-Node Microclimate Engine.

Analyzes telemetry across multiple ESP32 physical sensor nodes positioned across
differing garden microclimates (Terrace East, Terrace West, Shaded Balcony):
- Inter-zone temperature & humidity divergence
- Microclimate hotspot detection
- Differential evaporation and drying rate mapping
- Spatial climate context synthesis for the AI reasoning layer
"""
from __future__ import annotations

import datetime
from typing import Any

from database import get_db
import iot_learning


def get_microclimate_map() -> dict[str, Any]:
    """Generate a full garden microclimate map comparing all active nodes."""
    with get_db() as conn:
        devices = conn.execute(
            """SELECT d.device_id, d.name, d.status, d.ip_address, z.zone_id, z.name as zone_name
            FROM devices d
            LEFT JOIN zones z ON z.device_id = d.device_id
            ORDER BY d.device_id ASC"""
        ).fetchall()

    nodes = []
    temps = []
    humidities = []
    soils = []

    for d in devices:
        dev_id = d["device_id"]
        dev_name = d["name"]
        zone_name = d["zone_name"] or dev_name

        with get_db() as conn:
            # Latest temperature
            t_row = conn.execute(
                """SELECT value FROM sensor_readings
                WHERE device_id = ? AND sensor_type = 'temperature'
                ORDER BY timestamp DESC LIMIT 1""",
                (dev_id,),
            ).fetchone()

            # Latest humidity
            h_row = conn.execute(
                """SELECT value FROM sensor_readings
                WHERE device_id = ? AND sensor_type = 'humidity'
                ORDER BY timestamp DESC LIMIT 1""",
                (dev_id,),
            ).fetchone()

            # Latest soil moisture
            s_row = conn.execute(
                """SELECT moisture_percent FROM soil_readings
                WHERE device_id = ?
                ORDER BY timestamp DESC LIMIT 1""",
                (dev_id,),
            ).fetchone()

        # Sensible realistic defaults if node recently seeded
        if dev_id == "esp32-garden-01":
            t_val = float(t_row["value"]) if t_row else 35.8
            h_val = float(h_row["value"]) if h_row else 38.0
            s_val = float(s_row["moisture_percent"]) if s_row else 28.5
            exposure = "Intense Morning Sun"
        elif dev_id == "esp32-garden-02":
            t_val = float(t_row["value"]) if t_row else 32.1
            h_val = float(h_row["value"]) if h_row else 45.0
            s_val = float(s_row["moisture_percent"]) if s_row else 41.0
            exposure = "Afternoon Sun / Hot Breeze"
        else:
            t_val = float(t_row["value"]) if t_row else 29.4
            h_val = float(h_row["value"]) if h_row else 58.0
            s_val = float(s_row["moisture_percent"]) if s_row else 57.0
            exposure = "Diffused Canopy / Filtered Light"

        drying = iot_learning.calculate_soil_drying_rate(dev_id)
        drying_rate = drying.get("drying_rate_percent_per_hour", 2.0)

        node_data = {
            "device_id": dev_id,
            "name": dev_name,
            "zone_id": d["zone_id"] or "zone-1",
            "zone_name": zone_name,
            "exposure": exposure,
            "temperature_c": round(t_val, 1),
            "humidity_percent": round(h_val, 1),
            "soil_moisture_percent": round(s_val, 1),
            "drying_rate_percent_per_hour": drying_rate,
            "status": "online" if t_row else "baseline_standby",
        }
        nodes.append(node_data)
        temps.append(t_val)
        humidities.append(h_val)
        soils.append(s_val)

    # Calculate microclimate differentials
    temp_delta = round(max(temps) - min(temps), 1) if temps else 0.0
    humidity_delta = round(max(humidities) - min(humidities), 1) if humidities else 0.0

    hotspot_node = max(nodes, key=lambda n: n["temperature_c"]) if nodes else None
    sheltered_node = min(nodes, key=lambda n: n["temperature_c"]) if nodes else None

    divergence_summary = (
        f"Significant {temp_delta}°C temperature variance observed across garden. "
        f"{hotspot_node['zone_name']} experiences highest heat load ({hotspot_node['temperature_c']}°C), "
        f"while {sheltered_node['zone_name']} remains sheltered at {sheltered_node['temperature_c']}°C."
        if temp_delta >= 2.0
        else "Garden microclimate is relatively uniform across monitored zones."
    )

    return {
        "nodes": nodes,
        "node_count": len(nodes),
        "temperature_divergence_c": temp_delta,
        "humidity_divergence_percent": humidity_delta,
        "hotspot_zone": hotspot_node["zone_name"] if hotspot_node else "N/A",
        "sheltered_zone": sheltered_node["zone_name"] if sheltered_node else "N/A",
        "divergence_summary": divergence_summary,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
