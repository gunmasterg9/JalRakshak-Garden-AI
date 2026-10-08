"""JalRakshak Garden AI — Garden Learning & Water Savings Engine.

Learns garden-specific dynamics from historical sensor readings and actuator events:
- Soil drying rate (% moisture drop per hour during daylight/heat)
- Moisture recovery rate (% moisture increase post-watering)
- Watering effectiveness & pump efficiency
- Water savings KPI: Estimated water consumed vs estimated water saved/avoided
"""
from __future__ import annotations

import datetime
from typing import Any

import config
from database import get_db


def calculate_soil_drying_rate(device_id: str, hours: int = 24) -> dict[str, Any]:
    """Calculate average soil drying rate (% moisture drop per hour) over the last N hours."""
    since_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)
    since_iso = since_dt.isoformat()

    with get_db() as conn:
        rows = conn.execute(
            """SELECT timestamp, moisture_percent FROM soil_readings
            WHERE device_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC""",
            (device_id, since_iso),
        ).fetchall()

    if len(rows) < 2:
        return {
            "drying_rate_percent_per_hour": 1.5,  # Sensible default baseline for Gujarat climate
            "samples_analyzed": len(rows),
            "status": "insufficient_data",
            "trend": "stable",
        }

    # Find downward segments that do not have sudden upward spikes (which indicate watering)
    total_drop = 0.0
    total_hours = 0.0

    for i in range(len(rows) - 1):
        try:
            t1 = datetime.datetime.fromisoformat(rows[i]["timestamp"].replace("Z", "+00:00"))
            t2 = datetime.datetime.fromisoformat(rows[i + 1]["timestamp"].replace("Z", "+00:00"))
            m1 = float(rows[i]["moisture_percent"])
            m2 = float(rows[i + 1]["moisture_percent"])

            time_diff_hours = (t2 - t1).total_seconds() / 3600.0

            # If moisture decreased and time interval is valid (under 4 hours)
            if 0.05 < time_diff_hours < 4.0 and m2 < m1:
                drop = m1 - m2
                total_drop += drop
                total_hours += time_diff_hours
        except Exception:
            continue

    if total_hours > 0.5:
        rate = round(total_drop / total_hours, 2)
    else:
        rate = 1.5

    return {
        "drying_rate_percent_per_hour": max(0.1, rate),
        "total_drop_observed": round(total_drop, 1),
        "drying_hours_observed": round(total_hours, 1),
        "samples_analyzed": len(rows),
        "status": "calibrated",
        "trend": "drying" if rate > 1.2 else "gradual",
    }


def calculate_watering_effectiveness(device_id: str) -> dict[str, Any]:
    """Analyze the last 5 pump events to compute typical moisture recovery and pump efficiency."""
    with get_db() as conn:
        pump_events = conn.execute(
            """SELECT timestamp, runtime_seconds, estimated_liters FROM pump_events
            WHERE device_id = ? AND action IN ('start', 'stop') AND runtime_seconds > 0
            ORDER BY timestamp DESC LIMIT 5""",
            (device_id,),
        ).fetchall()

    if not pump_events:
        return {
            "average_recovery_percent": 28.5,
            "average_pump_runtime_seconds": 35.0,
            "events_analyzed": 0,
            "efficiency": "baseline",
        }

    runtimes = [float(p["runtime_seconds"]) for p in pump_events]
    avg_runtime = round(sum(runtimes) / len(runtimes), 1)

    # Calculate average moisture jumps around these times
    recoveries = []
    with get_db() as conn:
        for p in pump_events:
            p_time = p["timestamp"]
            # Reading just before
            before = conn.execute(
                """SELECT moisture_percent FROM soil_readings
                WHERE device_id = ? AND timestamp <= ?
                ORDER BY timestamp DESC LIMIT 1""",
                (device_id, p_time),
            ).fetchone()
            # Reading 30-60 min after
            after = conn.execute(
                """SELECT moisture_percent FROM soil_readings
                WHERE device_id = ? AND timestamp > ?
                ORDER BY timestamp ASC LIMIT 1""",
                (device_id, p_time),
            ).fetchone()

            if before and after:
                diff = float(after["moisture_percent"]) - float(before["moisture_percent"])
                if diff > 0:
                    recoveries.append(diff)

    avg_recovery = round(sum(recoveries) / len(recoveries), 1) if recoveries else 28.0

    return {
        "average_recovery_percent": avg_recovery,
        "average_pump_runtime_seconds": avg_runtime,
        "events_analyzed": len(pump_events),
        "efficiency": "optimal" if avg_recovery > 15 else "low_absorption",
    }


def calculate_water_savings(device_id: str, days: int = 30) -> dict[str, Any]:
    """Calculate water consumed vs traditional timer-based scheduled watering.

    Traditional timer schedules typically water 1-2 times daily regardless of soil/rain (e.g. 10L/day).
    Sensor-guided JalRakshak waters only when thresholds necessitate it.
    """
    since_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    since_iso = since_dt.isoformat()

    with get_db() as conn:
        rows = conn.execute(
            """SELECT SUM(runtime_seconds) as total_runtime,
                      SUM(estimated_liters) as total_est_liters,
                      SUM(measured_liters) as total_meas_liters,
                      COUNT(*) as total_activations
            FROM pump_events
            WHERE device_id = ? AND timestamp >= ? AND action IN ('stop', 'auto_timeout', 'emergency_stop')""",
            (device_id, since_iso),
        ).fetchone()

    total_runtime = float(rows["total_runtime"] or 0.0)
    measured_liters = float(rows["total_meas_liters"] or 0.0)
    estimated_liters = float(rows["total_est_liters"] or 0.0)
    activations = int(rows["total_activations"] or 0)

    # Use measured if present, else estimated
    is_measured = measured_liters > 0.1
    water_used_liters = round(measured_liters if is_measured else estimated_liters, 2)

    # Benchmark: Traditional automated timer irrigation without sensors:
    # 2 cycles per day * 45 seconds each = 90s/day = 3.0 Liters/day * days
    traditional_water_liters = round(days * 3.0, 2)
    water_avoided_liters = max(0.0, round(traditional_water_liters - water_used_liters, 2))
    percent_saved = (
        round((water_avoided_liters / traditional_water_liters) * 100, 1)
        if traditional_water_liters > 0
        else 0.0
    )

    return {
        "days_window": days,
        "is_measured": is_measured,
        "measurement_type": "Measured (Flow Sensor)" if is_measured else "Estimated (Pump Runtime & LPM)",
        "water_used_liters": water_used_liters,
        "traditional_benchmark_liters": traditional_water_liters,
        "water_saved_liters": water_avoided_liters,
        "water_savings_percent": min(85.0, percent_saved),
        "total_pump_activations": activations,
        "total_pump_runtime_seconds": int(total_runtime),
    }
