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


def calculate_drying_curve_2_0(device_id: str = "esp32-garden-01", days: int = 7) -> dict[str, Any]:
    """Drying Curve Engine 2.0 — Condition-segmented soil drying rates.

    Analyzes drying behavior across:
    - Morning (06:00 - 12:00)
    - Afternoon (12:00 - 18:00)
    - Night (18:00 - 06:00)
    - Hot day (temperature >= 35°C)
    - Humid day (relative humidity >= 60%)
    - Rainy day (precipitation / rain guard active)
    """
    since_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    since_iso = since_dt.isoformat()

    with get_db() as conn:
        soil_rows = conn.execute(
            """SELECT timestamp, moisture_percent FROM soil_readings
            WHERE device_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC""",
            (device_id, since_iso),
        ).fetchall()

        # Environmental history for correlating heat/humidity
        env_rows = conn.execute(
            """SELECT timestamp, sensor_type, value FROM sensor_readings
            WHERE device_id = ? AND timestamp >= ? AND sensor_type IN ('temperature', 'humidity')
            ORDER BY timestamp ASC""",
            (device_id, since_iso),
        ).fetchall()

    temp_by_time = {}
    hum_by_time = {}
    for r in env_rows:
        t_key = r["timestamp"][:16]  # Match up to minute
        if r["sensor_type"] == "temperature":
            temp_by_time[t_key] = float(r["value"])
        elif r["sensor_type"] == "humidity":
            hum_by_time[t_key] = float(r["value"])

    # Buckets for conditioned rates
    buckets = {
        "morning": {"drop": 0.0, "hours": 0.0},
        "afternoon": {"drop": 0.0, "hours": 0.0},
        "night": {"drop": 0.0, "hours": 0.0},
        "hot_day": {"drop": 0.0, "hours": 0.0},
        "humid_day": {"drop": 0.0, "hours": 0.0},
        "rainy_day": {"drop": 0.0, "hours": 0.0},
    }

    if len(soil_rows) >= 2:
        for i in range(len(soil_rows) - 1):
            try:
                t1 = datetime.datetime.fromisoformat(soil_rows[i]["timestamp"].replace("Z", "+00:00"))
                t2 = datetime.datetime.fromisoformat(soil_rows[i + 1]["timestamp"].replace("Z", "+00:00"))
                m1 = float(soil_rows[i]["moisture_percent"])
                m2 = float(soil_rows[i + 1]["moisture_percent"])

                dt_hours = (t2 - t1).total_seconds() / 3600.0

                if 0.05 < dt_hours < 4.0 and m2 < m1:
                    drop = m1 - m2
                    hour_of_day = t1.hour

                    # Time of day categorization
                    if 6 <= hour_of_day < 12:
                        buckets["morning"]["drop"] += drop
                        buckets["morning"]["hours"] += dt_hours
                    elif 12 <= hour_of_day < 18:
                        buckets["afternoon"]["drop"] += drop
                        buckets["afternoon"]["hours"] += dt_hours
                    else:
                        buckets["night"]["drop"] += drop
                        buckets["night"]["hours"] += dt_hours

                    # Environmental condition categorization
                    time_key = soil_rows[i]["timestamp"][:16]
                    t_val = temp_by_time.get(time_key, 30.0)
                    h_val = hum_by_time.get(time_key, 50.0)

                    if t_val >= 35.0:
                        buckets["hot_day"]["drop"] += drop
                        buckets["hot_day"]["hours"] += dt_hours
                    if h_val >= 60.0:
                        buckets["humid_day"]["drop"] += drop
                        buckets["humid_day"]["hours"] += dt_hours
                    if h_val >= 75.0 or t_val < 24.0:
                        buckets["rainy_day"]["drop"] += drop
                        buckets["rainy_day"]["hours"] += dt_hours
            except Exception:
                continue

    # Baseline fallbacks based on Gujarat climate science
    def _calc_rate(b_key: str, default: float) -> float:
        h = buckets[b_key]["hours"]
        if h > 0.3:
            return round(max(0.1, buckets[b_key]["drop"] / h), 2)
        return default

    rates = {
        "morning_drying_rate": _calc_rate("morning", 2.1),
        "afternoon_drying_rate": _calc_rate("afternoon", 5.4),
        "night_drying_rate": _calc_rate("night", 0.8),
        "hot_day_drying_rate": _calc_rate("hot_day", 5.8),
        "humid_day_drying_rate": _calc_rate("humid_day", 1.2),
        "rainy_day_drying_rate": _calc_rate("rainy_day", 0.4),
    }

    return {
        "device_id": device_id,
        "days_analyzed": days,
        "sample_count": len(soil_rows),
        "condition_rates": rates,
        "primary_peak_drying_window": "12:00–16:00 (Afternoon Solar Peak)",
        "minimal_evaporation_window": "20:00–06:00 (Overnight Stomatal Closure)",
        "status": "calibrated" if len(soil_rows) >= 4 else "baseline_model",
    }


def predict_soil_critical_time(
    device_id: str = "esp32-garden-01",
    plant_name: str = "Tomato",
) -> dict[str, Any]:
    """Predictive Watering Engine — Forecasts when soil will cross critical wilt threshold."""
    from plant_knowledge import lookup_plant_knowledge

    with get_db() as conn:
        soil_row = conn.execute(
            """SELECT moisture_percent, timestamp FROM soil_readings
            WHERE device_id = ?
            ORDER BY timestamp DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

        sample_count = conn.execute(
            "SELECT COUNT(*) FROM soil_readings WHERE device_id = ?",
            (device_id,),
        ).fetchone()[0]

    pk = lookup_plant_knowledge(plant_name)
    target_min = pk["soil_moisture_target_min"]
    crit_low = target_min * 0.75

    if not soil_row or sample_count < 2:
        return {
            "device_id": device_id,
            "plant_name": pk["canonical_name"],
            "status": "insufficient_data",
            "message": "Prediction unavailable. Collecting more garden data.",
            "prediction_confidence": "insufficient_data",
            "current_moisture": None,
            "predicted_critical_time": None,
            "hours_until_critical": None,
            "recommended_watering_window": "Check soil manually using finger probe.",
        }

    current_m = float(soil_row["moisture_percent"])
    now = datetime.datetime.now(datetime.timezone.utc)

    # Condition-based drying rate selection
    curves = calculate_drying_curve_2_0(device_id)
    rates = curves["condition_rates"]
    curr_hour = now.hour

    if 6 <= curr_hour < 12:
        active_rate = rates["morning_drying_rate"]
    elif 12 <= curr_hour < 18:
        active_rate = rates["afternoon_drying_rate"]
    else:
        active_rate = rates["night_drying_rate"]

    if current_m <= crit_low:
        return {
            "device_id": device_id,
            "plant_name": pk["canonical_name"],
            "status": "critical_now",
            "current_moisture": round(current_m, 1),
            "target_threshold": target_min,
            "critical_threshold": round(crit_low, 1),
            "hours_until_critical": 0.0,
            "predicted_critical_time": now.isoformat(),
            "prediction_confidence": "high",
            "recommended_watering_window": "Immediate (Soil is currently at or below wilt threshold)",
            "drying_rate_applied": active_rate,
        }

    # Time to reach critical threshold
    diff_percent = current_m - crit_low
    hours_left = round(diff_percent / max(0.1, active_rate), 1)
    critical_dt = now + datetime.timedelta(hours=hours_left)

    # Ideal early-morning or evening window before critical time
    if hours_left <= 4.0:
        win_desc = f"Today within the next {hours_left} hours"
    elif hours_left <= 18.0:
        win_desc = "Tomorrow morning between 06:00–07:30 AM"
    else:
        win_desc = f"In approximately {int(hours_left // 24)} days (Early morning preferred)"

    return {
        "device_id": device_id,
        "plant_name": pk["canonical_name"],
        "status": "predicting",
        "current_moisture": round(current_m, 1),
        "target_threshold": target_min,
        "critical_threshold": round(crit_low, 1),
        "hours_until_critical": hours_left,
        "predicted_critical_time": critical_dt.isoformat(),
        "prediction_confidence": "high" if sample_count > 10 else "medium",
        "recommended_watering_window": win_desc,
        "predicted_moisture_in_2h": max(5.0, round(current_m - (active_rate * 2), 1)),
        "predicted_moisture_in_4h": max(5.0, round(current_m - (active_rate * 4), 1)),
        "predicted_moisture_in_8h": max(5.0, round(current_m - (active_rate * 8), 1)),
        "drying_rate_applied": active_rate,
    }


def calculate_adaptive_watering_duration(
    device_id: str = "esp32-garden-01",
    plant_name: str = "Tomato",
    current_moisture: Optional[float] = None,
) -> dict[str, Any]:
    """Adaptive Watering Duration Engine — Learns runtime -> liters -> moisture increase."""
    from plant_knowledge import lookup_plant_knowledge

    with get_db() as conn:
        pump_events = conn.execute(
            """SELECT timestamp, runtime_seconds, estimated_liters, measured_liters
            FROM pump_events
            WHERE device_id = ? AND action IN ('start', 'stop') AND runtime_seconds >= 10
            ORDER BY timestamp DESC LIMIT 10""",
            (device_id,),
        ).fetchall()

        if current_moisture is None:
            s_row = conn.execute(
                """SELECT moisture_percent FROM soil_readings
                WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1""",
                (device_id,),
            ).fetchone()
            current_moisture = float(s_row["moisture_percent"]) if s_row else 30.0

    pk = lookup_plant_knowledge(plant_name)
    target_min = pk["soil_moisture_target_min"]
    target_max = pk["soil_moisture_target_max"]
    desired_moisture = target_min + (target_max - target_min) * 0.6  # Aim for sweet spot (60% into optimal)

    # Calculate learned moisture recovery per second of pump runtime
    delta_rates = []
    with get_db() as conn:
        for p in pump_events:
            p_time = p["timestamp"]
            runtime = float(p["runtime_seconds"])
            if runtime <= 0:
                continue

            before = conn.execute(
                "SELECT moisture_percent FROM soil_readings WHERE device_id = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 1",
                (device_id, p_time),
            ).fetchone()
            after = conn.execute(
                "SELECT moisture_percent FROM soil_readings WHERE device_id = ? AND timestamp > ? ORDER BY timestamp ASC LIMIT 1",
                (device_id, p_time),
            ).fetchone()

            if before and after:
                diff = float(after["moisture_percent"]) - float(before["moisture_percent"])
                if diff > 1.0:
                    delta_rates.append(diff / runtime)

    if delta_rates:
        recovery_per_sec = sum(delta_rates) / len(delta_rates)
        confidence = "learned_historical"
    else:
        # Botanical baseline: typical mini DC pump gives ~0.8% moisture increase per second in standard 10L pot
        recovery_per_sec = 0.8
        confidence = "botanical_baseline"

    needed_delta = max(0.0, desired_moisture - current_moisture)
    calc_seconds = needed_delta / max(0.1, recovery_per_sec)

    # Strictly clamp between 10 seconds and hardware safety limit (config.MAX_PUMP_RUNTIME = 60s)
    recommended_runtime = int(max(10, min(config.MAX_PUMP_RUNTIME, round(calc_seconds))))

    # Estimated liters delivered based on typical 2.0 LPM mini pump flow
    est_liters = round((recommended_runtime / 60.0) * 2.0, 2)

    return {
        "device_id": device_id,
        "plant_name": pk["canonical_name"],
        "current_moisture": round(current_moisture, 1),
        "target_sweet_spot": round(desired_moisture, 1),
        "needed_moisture_increase": round(needed_delta, 1),
        "learned_recovery_percent_per_second": round(recovery_per_sec, 3),
        "recommended_duration_seconds": recommended_runtime,
        "estimated_liters_delivered": est_liters,
        "confidence": confidence,
        "historical_events_analyzed": len(delta_rates),
        "hardware_max_safety_limit": config.MAX_PUMP_RUNTIME,
    }


def calculate_flow_intelligence(device_id: Optional[str] = None, days: int = 30) -> dict[str, Any]:
    """Flow Sensor Intelligence — Distinguishes MEASURED vs ESTIMATED water delivery."""
    since_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    since_iso = since_dt.isoformat()

    query = """SELECT device_id, runtime_seconds, estimated_liters, measured_liters
               FROM pump_events
               WHERE timestamp >= ? AND action IN ('stop', 'auto_timeout', 'emergency_stop')"""
    params: list[Any] = [since_iso]
    if device_id:
        query += " AND device_id = ?"
        params.append(device_id)

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    measured_total = 0.0
    estimated_total = 0.0
    measured_count = 0
    estimated_count = 0

    for r in rows:
        meas = float(r["measured_liters"] or 0.0)
        est = float(r["estimated_liters"] or 0.0)
        if meas > 0.05:
            measured_total += meas
            measured_count += 1
        elif est > 0.0:
            estimated_total += est
            estimated_count += 1

    total_events = len(rows)
    primary_source = (
        "MEASURED"
        if measured_count > estimated_count and measured_total > 0
        else ("ESTIMATED" if total_events > 0 else "UNKNOWN")
    )

    avg_per_watering = round((measured_total + estimated_total) / max(1, total_events), 2)
    daily_average = round((measured_total + estimated_total) / max(1, days), 2)
    weekly_projection = round(daily_average * 7.0, 2)

    return {
        "days_analyzed": days,
        "primary_source": primary_source,
        "measured_liters": round(measured_total, 2),
        "estimated_liters": round(estimated_total, 2),
        "total_water_liters": round(measured_total + estimated_total, 2),
        "measured_events_count": measured_count,
        "estimated_events_count": estimated_count,
        "average_liters_per_watering": avg_per_watering,
        "daily_average_liters": daily_average,
        "weekly_projected_liters": weekly_projection,
    }


def calculate_water_budget() -> dict[str, Any]:
    """Water Budget Subsystem — Compares real consumption against weekly conservation targets."""
    now = datetime.datetime.now(datetime.timezone.utc)
    week_start = now - datetime.timedelta(days=7)

    with get_db() as conn:
        budget_row = conn.execute(
            "SELECT target_liters, period_type, warning_threshold_percent FROM water_budgets WHERE is_active = 1 LIMIT 1"
        ).fetchone()

        water_row = conn.execute(
            """SELECT SUM(COALESCE(measured_liters, estimated_liters, 0.0)) as used_liters
            FROM pump_events
            WHERE timestamp >= ? AND action IN ('stop', 'auto_timeout', 'emergency_stop')""",
            (week_start.isoformat(),),
        ).fetchone()

    target_liters = float(budget_row["target_liters"]) if budget_row else 80.0
    period = budget_row["period_type"] if budget_row else "weekly"
    warn_threshold = float(budget_row["warning_threshold_percent"]) if budget_row else 80.0
    used_liters = round(float(water_row["used_liters"] or 0.0), 2)

    percent_used = round((used_liters / max(1.0, target_liters)) * 100, 1)
    remaining_liters = max(0.0, round(target_liters - used_liters, 2))

    if percent_used >= 100.0:
        status = "OVER_BUDGET"
        message = f"🚨 Water budget exceeded: {used_liters}L used vs {target_liters}L target ({percent_used}%)."
    elif percent_used >= warn_threshold:
        status = "WATCH"
        message = f"⚠️ Nearing budget limit: {used_liters}L used ({percent_used}% of {target_liters}L target)."
    else:
        status = "NORMAL"
        message = f"✅ On track: {remaining_liters}L remaining ({percent_used}% of budget consumed)."

    return {
        "period_type": period,
        "target_liters": target_liters,
        "consumed_liters": used_liters,
        "remaining_liters": remaining_liters,
        "percent_consumed": percent_used,
        "status": status,
        "advisory": message,
        "as_of": now.isoformat(),
    }

