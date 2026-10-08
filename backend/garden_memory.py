"""JalRakshak Garden AI — Persistent Garden Memory Subsystem.

Stores, indexes, and retrieves pivotal garden events across multiple sources:
- SENSOR (anomalies, drying spikes, recovery jumps)
- USER (approvals, rejections, manual waterings, pruning, notes)
- AI (recommendations, diagnostic assessments, reasoning)
- SYSTEM (pump runtimes, safety lockouts, watchdog triggers)
- WEATHER (rain guard activations, heatwave alerts, precipitation)

Provides contextual memory summaries to ground local Ollama AI reasoning.
"""
from __future__ import annotations

import datetime
import json
import logging
from typing import Any, Optional

from database import get_db

logger = logging.getLogger("jalrakshak.garden_memory")

VALID_SOURCES = {"SENSOR", "USER", "AI", "SYSTEM", "WEATHER"}

VALID_EVENT_TYPES = {
    "watering",
    "sensor_anomaly",
    "plant_observation",
    "plant_photo",
    "ai_recommendation",
    "user_approval",
    "user_rejection",
    "pump_event",
    "water_consumption",
    "weather_event",
    "heat_event",
    "rain_event",
    "plant_stress",
    "fertilization",
    "pruning",
    "experiment_result",
}


def record_memory_event(
    event_type: str,
    source: str,
    plant_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    data: Optional[dict[str, Any]] = None,
    timestamp: Optional[str] = None,
) -> int:
    """Record an immutable event into Garden Memory."""
    src = source.upper() if source else "SYSTEM"
    if src not in VALID_SOURCES:
        src = "SYSTEM"

    evt = event_type.lower() if event_type else "plant_observation"

    now_iso = timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat()
    data_payload = json.dumps(data or {})

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO garden_memory
            (timestamp, plant_id, zone_id, event_type, source, data_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (now_iso, plant_id, zone_id, evt, src, data_payload, now_iso),
        )
        event_id = cursor.lastrowid

    logger.debug("Garden memory event recorded: #%d (%s by %s)", event_id, evt, src)
    return event_id or 0


def query_memory_events(
    plant_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    event_type: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 50,
    hours: Optional[int] = None,
) -> list[dict[str, Any]]:
    """Retrieve structured memory events filtered by plant, zone, type, and age."""
    query = "SELECT id, timestamp, plant_id, zone_id, event_type, source, data_json FROM garden_memory WHERE 1=1"
    params: list[Any] = []

    if plant_id:
        query += " AND (plant_id = ? OR plant_id IS NULL)"
        params.append(plant_id)

    if zone_id:
        query += " AND (zone_id = ? OR zone_id IS NULL)"
        params.append(zone_id)

    if event_type:
        query += " AND event_type = ?"
        params.append(event_type.lower())

    if source:
        query += " AND source = ?"
        params.append(source.upper())

    if hours and hours > 0:
        since_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)
        query += " AND timestamp >= ?"
        params.append(since_dt.isoformat())

    query += " ORDER BY id DESC LIMIT ?"
    params.append(min(200, max(1, limit)))

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    events = []
    for r in rows:
        try:
            parsed_data = json.loads(r["data_json"])
        except Exception:
            parsed_data = {}

        events.append(
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "plant_id": r["plant_id"],
                "zone_id": r["zone_id"],
                "event_type": r["event_type"],
                "source": r["source"],
                "data": parsed_data,
            }
        )
    return events


def get_memory_context_for_ai(
    plant_name: Optional[str] = None,
    zone_id: Optional[str] = None,
    hours: int = 72,
    max_entries: int = 10,
) -> str:
    """Format recent garden memory into a compact, evidence-rich string for Ollama prompt injection."""
    events = query_memory_events(
        plant_id=plant_name,
        zone_id=zone_id,
        limit=max_entries,
        hours=hours,
    )

    if not events:
        return "No notable historical garden events recorded in the last 72 hours."

    lines = []
    for evt in reversed(events):  # Chronological order
        t_str = evt["timestamp"].split("T")[0] + " " + evt["timestamp"].split("T")[1][:5]
        evt_type = evt["event_type"].replace("_", " ").title()
        src = evt["source"]
        data = evt["data"]

        desc = ""
        if "summary" in data:
            desc = data["summary"]
        elif "note" in data:
            desc = data["note"]
        elif "reason" in data:
            desc = data["reason"]
        elif "runtime_seconds" in data:
            desc = f"Pump ran {data['runtime_seconds']}s, delivered {data.get('liters', 0)}L"
        elif "moisture" in data:
            desc = f"Soil at {data['moisture']}%"
        else:
            desc = json.dumps(data) if data else ""

        lines.append(f"- [{t_str}] ({src}) {evt_type}: {desc}")

    return "\n".join(lines)
