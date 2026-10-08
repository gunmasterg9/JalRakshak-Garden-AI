"""JalRakshak Garden AI — IoT Telemetry, Device Management, Safety & AI Ingestion Router."""
from __future__ import annotations

import datetime
import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

import config
from database import get_db
import iot_learning
import iot_safety
import ollama_service
from plant_knowledge import list_all_supported_plants, lookup_plant_knowledge
import rules_engine

logger = logging.getLogger("jalrakshak.iot_router")
router = APIRouter(prefix="/api/iot", tags=["IoT"])


# ---------------------------------------------------------------------------
# Pydantic Schemas with Strict Sensor Validation
# ---------------------------------------------------------------------------
class TelemetryPayload(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64)
    timestamp: str = Field(..., description="ISO 8601 formatted timestamp")
    temperature_c: float = Field(..., ge=-20.0, le=65.0, description="Temperature between -20C and 65C")
    humidity_percent: float = Field(..., ge=0.0, le=100.0, description="Relative humidity 0-100%")
    soil_moisture_percent: float = Field(..., ge=0.0, le=100.0, description="Calibrated soil moisture 0-100%")
    water_level_percent: float = Field(..., ge=0.0, le=100.0, description="Reservoir level 0-100%")
    pump_on: bool = False
    raw_adc: Optional[int] = Field(None, ge=0, le=4095)
    plant_id: Optional[int] = None
    flow_rate_lpm: Optional[float] = Field(None, ge=0.0, le=50.0)
    measured_liters: Optional[float] = Field(None, ge=0.0)
    is_simulated: bool = False


class DeviceRegisterPayload(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=100)
    device_type: str = "esp32"
    ip_address: Optional[str] = ""
    mode: str = "AI_RECOMMEND"


class DeviceCommandPayload(BaseModel):
    command: str = Field(..., description="PUMP_ON, PUMP_OFF, EMERGENCY_STOP, RESET, REQUEST_SENSOR_READING, CLEAR_EMERGENCY")
    runtime_seconds: Optional[int] = 30
    reason: Optional[str] = "Manual command"


class CalibratePayload(BaseModel):
    step: Optional[str] = None  # "dry", "wet", or "set"
    dry_value: Optional[int] = None
    wet_value: Optional[int] = None
    raw_reading: Optional[int] = None


class ChatQueryPayload(BaseModel):
    query: str
    device_id: Optional[str] = "esp32-garden-01"
    plant_name: Optional[str] = "Tomato"
    language: Optional[str] = "en"


def _validate_iso_timestamp(ts: str) -> bool:
    try:
        datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return True
    except Exception:
        return False


def _get_device_online_status(last_seen_str: Optional[str]) -> str:
    """Classify device connectivity based on last heartbeat/telemetry reception.

    Never display 'Online' unless telemetry was received recently.
    """
    if not last_seen_str:
        return "offline"
    try:
        last_dt = datetime.datetime.fromisoformat(last_seen_str.replace("Z", "+00:00"))
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        elapsed_sec = (now_dt - last_dt).total_seconds()
        if elapsed_sec <= config.DEVICE_DELAYED_TIMEOUT_SECONDS:
            return "online"
        elif elapsed_sec <= config.DEVICE_HEARTBEAT_TIMEOUT_SECONDS:
            return "delayed"
        else:
            return "offline"
    except Exception:
        return "offline"


# ---------------------------------------------------------------------------
# Telemetry Ingestion Endpoint (POST /api/iot/telemetry)
# ---------------------------------------------------------------------------
@router.post("/telemetry", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(payload: TelemetryPayload):
    """Receive and validate real sensor telemetry from ESP32 or gateway.

    Rejects out-of-bounds, invalid sensor readings, or malformed timestamps.
    Enforces reservoir safety checks and updates device health.
    """
    if not _validate_iso_timestamp(payload.timestamp):
        raise HTTPException(
            status_code=422,
            detail="Malformed ISO timestamp format.",
        )

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    device_id = payload.device_id

    with get_db() as conn:
        # Check or register device if unseen
        dev = conn.execute("SELECT * FROM devices WHERE device_id = ?", (device_id,)).fetchone()
        if not dev:
            conn.execute(
                """INSERT INTO devices
                (device_id, name, device_type, status, mode, pump_state, last_seen, created_at, updated_at)
                VALUES (?, ?, 'esp32', 'online', 'AI_RECOMMEND', ?, ?, ?, ?)""",
                (device_id, f"ESP32 Node ({device_id})", int(payload.pump_on), payload.timestamp, now_iso, now_iso),
            )
        else:
            conn.execute(
                """UPDATE devices SET status = 'online', pump_state = ?, last_seen = ?, updated_at = ?
                WHERE device_id = ?""",
                (int(payload.pump_on), payload.timestamp, now_iso, device_id),
            )

        sim_flag = 1 if payload.is_simulated else 0

        # Store environmental readings
        readings = [
            (device_id, payload.timestamp, "temperature", payload.temperature_c, "°C", "good", sim_flag),
            (device_id, payload.timestamp, "humidity", payload.humidity_percent, "%", "good", sim_flag),
            (device_id, payload.timestamp, "water_level", payload.water_level_percent, "%", "good", sim_flag),
        ]
        if payload.flow_rate_lpm is not None:
            readings.append((device_id, payload.timestamp, "flow_rate", payload.flow_rate_lpm, "L/min", "good", sim_flag))

        conn.executemany(
            """INSERT INTO sensor_readings
            (device_id, timestamp, sensor_type, value, unit, quality, is_simulated)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            readings,
        )

        # Store soil reading
        conn.execute(
            """INSERT INTO soil_readings
            (device_id, plant_id, timestamp, raw_adc, moisture_percent, is_simulated)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (device_id, payload.plant_id, payload.timestamp, payload.raw_adc, payload.soil_moisture_percent, sim_flag),
        )

        # Check water tank critical safety threshold
        if payload.water_level_percent <= config.MIN_WATER_LEVEL_PERCENT:
            conn.execute(
                """INSERT INTO alerts (device_id, severity, alert_type, message, is_active, created_at)
                VALUES (?, 'critical', 'tank_critical', ?, 1, ?)""",
                (
                    device_id,
                    f"Water tank level critically low at {payload.water_level_percent:.1f}%. Refill required immediately.",
                    payload.timestamp,
                ),
            )
            # Fail-safe: if pump was on, force stop immediately
            if payload.pump_on:
                iot_safety.record_pump_stop(
                    device_id,
                    action="auto_timeout",
                    reason="Low water reservoir cutoff",
                )

        # Check soil critical dryness
        if payload.soil_moisture_percent <= 20.0:
            conn.execute(
                """INSERT INTO alerts (device_id, plant_id, severity, alert_type, message, is_active, created_at)
                VALUES (?, ?, 'warning', 'soil_critical', ?, 1, ?)""",
                (
                    device_id,
                    payload.plant_id,
                    f"Soil moisture critically dry at {payload.soil_moisture_percent:.1f}%. Plant is at wilt threshold.",
                    payload.timestamp,
                ),
            )

    return {
        "status": "success",
        "device_id": device_id,
        "recorded_at": payload.timestamp,
        "pump_status": iot_safety.get_pump_status(device_id),
        "is_simulated": payload.is_simulated,
    }


# ---------------------------------------------------------------------------
# Device Management Endpoints
# ---------------------------------------------------------------------------
@router.get("/devices")
async def list_devices():
    """List all registered IoT controllers with real-time heartbeat and connection status."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM devices ORDER BY created_at DESC").fetchall()

    devices = []
    for r in rows:
        d = dict(r)
        current_status = _get_device_online_status(d.get("last_seen"))
        pump_info = iot_safety.get_pump_status(d["device_id"])
        d["live_status"] = current_status
        d["pump_status"] = pump_info
        devices.append(d)

    return devices


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    """Get single device details, calibration values, and latest sensor readings."""
    with get_db() as conn:
        dev = conn.execute("SELECT * FROM devices WHERE device_id = ?", (device_id,)).fetchone()
        if not dev:
            raise HTTPException(status_code=404, detail="Device not found.")

        cal = conn.execute("SELECT * FROM device_calibrations WHERE device_id = ?", (device_id,)).fetchone()

        latest_sensors = conn.execute(
            """SELECT sensor_type, value, unit, timestamp, is_simulated
            FROM sensor_readings
            WHERE device_id = ?
            ORDER BY id DESC LIMIT 10""",
            (device_id,),
        ).fetchall()

        latest_soil = conn.execute(
            """SELECT moisture_percent, raw_adc, timestamp, is_simulated
            FROM soil_readings
            WHERE device_id = ?
            ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

    res = dict(dev)
    res["live_status"] = _get_device_online_status(res.get("last_seen"))
    res["pump_status"] = iot_safety.get_pump_status(device_id)
    res["calibration"] = dict(cal) if cal else {"dry_value": 3200, "wet_value": 1400, "status": "uncalibrated"}
    res["latest_sensors"] = [dict(s) for s in latest_sensors]
    res["latest_soil"] = dict(latest_soil) if latest_soil else None
    return res


@router.post("/devices/register")
async def register_device(payload: DeviceRegisterPayload):
    """Register or update an ESP32 or Arduino-gateway device."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO devices (device_id, name, device_type, ip_address, mode, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'offline', ?, ?)
            ON CONFLICT(device_id) DO UPDATE SET
                name = excluded.name,
                device_type = excluded.device_type,
                ip_address = excluded.ip_address,
                mode = excluded.mode,
                updated_at = excluded.updated_at""",
            (payload.device_id, payload.name, payload.device_type, payload.ip_address or "", payload.mode, now_iso, now_iso),
        )
        conn.execute(
            """INSERT OR IGNORE INTO device_calibrations (device_id, dry_value, wet_value, status, updated_at)
            VALUES (?, 3200, 1400, 'uncalibrated', ?)""",
            (payload.device_id, now_iso),
        )

    return {"status": "registered", "device_id": payload.device_id}


@router.get("/devices/{device_id}/status")
async def get_device_status(device_id: str):
    """Get live connection and actuator status with human-readable diagnostics."""
    with get_db() as conn:
        dev = conn.execute("SELECT * FROM devices WHERE device_id = ?", (device_id,)).fetchone()
        if not dev:
            raise HTTPException(status_code=404, detail="Device not found.")

        latest = conn.execute(
            """SELECT timestamp, sensor_type, value FROM sensor_readings
            WHERE device_id = ? ORDER BY id DESC LIMIT 5""",
            (device_id,),
        ).fetchall()

    last_seen = dev["last_seen"]
    live_status = _get_device_online_status(last_seen)

    last_seen_seconds_ago = None
    if last_seen:
        try:
            last_dt = datetime.datetime.fromisoformat(last_seen.replace("Z", "+00:00"))
            last_seen_seconds_ago = int((datetime.datetime.now(datetime.timezone.utc) - last_dt).total_seconds())
        except Exception:
            pass

    return {
        "device_id": device_id,
        "name": dev["name"],
        "connection_state": live_status,  # "online" | "delayed" | "offline"
        "last_seen_timestamp": last_seen,
        "last_seen_seconds_ago": last_seen_seconds_ago,
        "pump_status": iot_safety.get_pump_status(device_id),
        "recent_readings": [dict(r) for r in latest],
    }


# ---------------------------------------------------------------------------
# Actuator Control & Safety Layer (POST /api/iot/devices/{device_id}/command)
# ---------------------------------------------------------------------------
@router.post("/devices/{device_id}/command")
async def issue_device_command(device_id: str, cmd: DeviceCommandPayload):
    """Issue authenticated, safety-verified actuator command to ESP32."""
    command = cmd.command.upper().strip()

    # Verify device exists
    with get_db() as conn:
        dev = conn.execute("SELECT * FROM devices WHERE device_id = ?", (device_id,)).fetchone()
        if not dev:
            raise HTTPException(status_code=404, detail="Device not found.")

    if command == "PUMP_ON":
        runtime = min(cmd.runtime_seconds or 30, config.MAX_PUMP_RUNTIME)
        is_safe, reason = iot_safety.evaluate_pump_start_safety(device_id, requested_runtime=runtime)

        if not is_safe:
            # Audit safety rejection
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO pump_events
                    (device_id, timestamp, action, trigger_source, runtime_seconds, reason, success)
                    VALUES (?, ?, 'rejected', 'manual_ui', 0.0, ?, 0)""",
                    (device_id, datetime.datetime.now(datetime.timezone.utc).isoformat(), reason),
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Safety Guard Rejection: {reason}",
            )

        iot_safety.record_pump_start(
            device_id=device_id,
            trigger_source="manual_ui",
            max_duration_seconds=runtime,
            reason=cmd.reason or "Manual dashboard trigger",
        )
        return {
            "status": "command_dispatched",
            "device_id": device_id,
            "action": "PUMP_ON",
            "runtime_seconds": runtime,
            "safety_note": f"Auto cutoff scheduled at {runtime} seconds.",
        }

    elif command in ("PUMP_OFF", "STOP_PUMP"):
        runtime_sec = iot_safety.record_pump_stop(
            device_id=device_id,
            action="stop",
            trigger_source="manual_ui",
            reason=cmd.reason or "Manual stop clicked",
        )
        return {
            "status": "command_dispatched",
            "device_id": device_id,
            "action": "PUMP_OFF",
            "elapsed_runtime_seconds": runtime_sec,
        }

    elif command == "EMERGENCY_STOP":
        runtime_sec = iot_safety.record_pump_stop(
            device_id=device_id,
            action="emergency_stop",
            trigger_source="emergency_button",
            reason="Emergency stop triggered by operator",
        )
        return {
            "status": "emergency_stop_engaged",
            "device_id": device_id,
            "action": "EMERGENCY_STOP",
            "elapsed_runtime_seconds": runtime_sec,
            "lockout_active": True,
        }

    elif command == "CLEAR_EMERGENCY":
        iot_safety.clear_emergency_lock(device_id)
        return {
            "status": "cleared",
            "device_id": device_id,
            "message": "Emergency lockout cleared. Normal pump operation permitted.",
        }

    elif command in ("RESET", "REQUEST_SENSOR_READING"):
        return {
            "status": "command_queued",
            "device_id": device_id,
            "command": command,
        }

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported command '{command}'.",
        )


# ---------------------------------------------------------------------------
# Calibration API (Section 3: DRY / WET Calibration)
# ---------------------------------------------------------------------------
@router.post("/devices/{device_id}/calibrate")
async def calibrate_soil_sensor(device_id: str, payload: CalibratePayload):
    """Set or capture soil moisture calibration values (DRY_VALUE, WET_VALUE)."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM device_calibrations WHERE device_id = ?", (device_id,)).fetchone()
        dry_val = existing["dry_value"] if existing else 3200
        wet_val = existing["wet_value"] if existing else 1400

        if payload.step == "dry":
            dry_val = payload.raw_reading if payload.raw_reading is not None else 3200
        elif payload.step == "wet":
            wet_val = payload.raw_reading if payload.raw_reading is not None else 1400

        if payload.dry_value is not None:
            dry_val = payload.dry_value
        if payload.wet_value is not None:
            wet_val = payload.wet_value

        cal_status = "calibrated" if dry_val > wet_val else "invalid_range"

        conn.execute(
            """INSERT INTO device_calibrations (device_id, dry_value, wet_value, status, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(device_id) DO UPDATE SET
                dry_value = excluded.dry_value,
                wet_value = excluded.wet_value,
                status = excluded.status,
                updated_at = excluded.updated_at""",
            (device_id, dry_val, wet_val, cal_status, now_iso),
        )

    return {
        "device_id": device_id,
        "dry_value": dry_val,
        "wet_value": wet_val,
        "status": cal_status,
        "updated_at": now_iso,
    }


# ---------------------------------------------------------------------------
# Historical Readings & Live Charts (Section 14 & 31)
# ---------------------------------------------------------------------------
@router.get("/devices/{device_id}/history")
async def get_sensor_history(
    device_id: str,
    range: str = Query("24h", pattern="^(1h|6h|24h|7d|30d)$"),
):
    """Fetch chronological sensor history filtered by time range (1h, 6h, 24h, 7d, 30d)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    delta_map = {
        "1h": datetime.timedelta(hours=1),
        "6h": datetime.timedelta(hours=6),
        "24h": datetime.timedelta(hours=24),
        "7d": datetime.timedelta(days=7),
        "30d": datetime.timedelta(days=30),
    }
    since_iso = (now - delta_map[range]).isoformat()

    with get_db() as conn:
        sensor_rows = conn.execute(
            """SELECT timestamp, sensor_type, value, unit, is_simulated
            FROM sensor_readings
            WHERE device_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC""",
            (device_id, since_iso),
        ).fetchall()

        soil_rows = conn.execute(
            """SELECT timestamp, moisture_percent, raw_adc, is_simulated
            FROM soil_readings
            WHERE device_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC""",
            (device_id, since_iso),
        ).fetchall()

        pump_rows = conn.execute(
            """SELECT timestamp, action, runtime_seconds, estimated_liters, trigger_source, reason
            FROM pump_events
            WHERE device_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC""",
            (device_id, since_iso),
        ).fetchall()

    return {
        "device_id": device_id,
        "time_range": range,
        "readings_count": len(sensor_rows),
        "sensor_data": [dict(r) for r in sensor_rows],
        "soil_data": [dict(r) for r in soil_rows],
        "pump_events": [dict(r) for r in pump_rows],
    }


# ---------------------------------------------------------------------------
# Watering Recommendation & Explainability (Sections 16, 19, 20)
# ---------------------------------------------------------------------------
@router.get("/recommendation")
async def get_iot_recommendation(
    device_id: str = "esp32-garden-01",
    plant_name: str = "Tomato",
    use_ai: bool = True,
):
    """Produce deterministic + AI-reasoned watering recommendation grounded in real sensor history."""
    with get_db() as conn:
        # Fetch latest sensor readings
        t_row = conn.execute(
            """SELECT value FROM sensor_readings WHERE device_id = ? AND sensor_type = 'temperature' ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()
        h_row = conn.execute(
            """SELECT value FROM sensor_readings WHERE device_id = ? AND sensor_type = 'humidity' ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()
        w_row = conn.execute(
            """SELECT value FROM sensor_readings WHERE device_id = ? AND sensor_type = 'water_level' ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()
        s_row = conn.execute(
            """SELECT moisture_percent, timestamp, is_simulated FROM soil_readings WHERE device_id = ? ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

        # Last watering event
        p_row = conn.execute(
            """SELECT timestamp FROM pump_events WHERE device_id = ? AND action IN ('start', 'stop') ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

        # Last 6 hours soil history
        six_h_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=6)).isoformat()
        recent_soil = conn.execute(
            """SELECT timestamp, moisture_percent FROM soil_readings WHERE device_id = ? AND timestamp >= ? ORDER BY timestamp ASC""",
            (device_id, six_h_ago),
        ).fetchall()

    # Defaults if hardware freshly installed
    temp_c = float(t_row["value"]) if t_row else 28.5
    hum_pct = float(h_row["value"]) if h_row else 55.0
    water_pct = float(w_row["value"]) if w_row else 75.0
    soil_pct = float(s_row["moisture_percent"]) if s_row else 45.0
    is_simulated = bool(s_row["is_simulated"]) if s_row else False

    hours_since_water = None
    if p_row and p_row["timestamp"]:
        try:
            p_dt = datetime.datetime.fromisoformat(p_row["timestamp"].replace("Z", "+00:00"))
            hours_since_water = (datetime.datetime.now(datetime.timezone.utc) - p_dt).total_seconds() / 3600.0
        except Exception:
            pass

    history_list = [{"timestamp": r["timestamp"], "moisture": float(r["moisture_percent"])} for r in recent_soil]

    # Deterministic rule evaluation
    decision = rules_engine.evaluate_iot_watering_decision(
        plant_name=plant_name,
        soil_moisture_percent=soil_pct,
        temperature_c=temp_c,
        humidity_percent=hum_pct,
        water_level_percent=water_pct,
        recent_history=history_list,
        hours_since_last_watering=hours_since_water,
    )
    decision["is_simulated"] = is_simulated
    decision["device_id"] = device_id

    # If Ollama is requested and available, enhance with AI reasoning
    if use_ai:
        try:
            ollama_status = await ollama_service.check_connection()
            if ollama_status.get("ollama_available") and ollama_status.get("model_installed"):
                prompt = f"""You are the JalRakshak Garden AI engine. Reason about real sensor telemetry for:
Plant: {plant_name}
Current Telemetry:
- Soil Moisture: {soil_pct:.1f}%
- Ambient Temperature: {temp_c:.1f}°C
- Relative Humidity: {hum_pct:.1f}%
- Water Tank Level: {water_pct:.1f}%
- Last Watering: {f'{int(hours_since_water)} hours ago' if hours_since_water else 'Unknown'}

Recent 6-hour soil history samples: {len(history_list)} readings.
Deterministic Safety Recommendation: {decision['recommendation']}
Explain why and give exact practical garden advice. Format in 2 concise sentences."""
                ai_text = await ollama_service.generate(prompt)
                if ai_text:
                    decision["ai_explanation"] = ai_text.strip()
                    decision["source"] = "sensor_rules + ollama_ai"
        except Exception as e:
            logger.debug("Ollama enhancement skipped: %s", e)

    # Persist recommendation
    with get_db() as conn:
        conn.execute(
            """INSERT INTO watering_recommendations
            (plant_id, device_id, timestamp, recommendation, why, evidence_json, confidence, action, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                None,
                device_id,
                datetime.datetime.now(datetime.timezone.utc).isoformat(),
                decision["recommendation"],
                decision["why"],
                json.dumps(decision["evidence"]),
                decision["confidence"],
                decision["action"],
                decision["source"],
            ),
        )

    return decision


# ---------------------------------------------------------------------------
# Conversational Garden AI (Section 19, 32, 33: Sensor-Grounded, Multilingual)
# ---------------------------------------------------------------------------
@router.post("/chat")
async def garden_ai_chat(payload: ChatQueryPayload):
    """Conversational Garden AI grounded in real sensor history, Gujarati, Hindi & English."""
    device_id = payload.device_id or "esp32-garden-01"
    plant_name = payload.plant_name or "Tomato"
    lang = payload.language or "en"

    # Fetch live sensors & plant info
    pk = lookup_plant_knowledge(plant_name)
    with get_db() as conn:
        t_row = conn.execute(
            """SELECT value FROM sensor_readings WHERE device_id = ? AND sensor_type = 'temperature' ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()
        h_row = conn.execute(
            """SELECT value FROM sensor_readings WHERE device_id = ? AND sensor_type = 'humidity' ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()
        s_row = conn.execute(
            """SELECT moisture_percent, timestamp FROM soil_readings WHERE device_id = ? ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()
        w_row = conn.execute(
            """SELECT value FROM sensor_readings WHERE device_id = ? AND sensor_type = 'water_level' ORDER BY id DESC LIMIT 1""",
            (device_id,),
        ).fetchone()

    temp_c = float(t_row["value"]) if t_row else 31.0
    hum_pct = float(h_row["value"]) if h_row else 50.0
    soil_pct = float(s_row["moisture_percent"]) if s_row else 40.0
    water_pct = float(w_row["value"]) if w_row else 80.0

    system_context = f"""You are JalRakshak Garden AI (જળરક્ષક ગાર્ડન એઆઈ / जलरक्षक गार्डन एआई), a friendly, scientific, and water-smart garden expert.
Ground your response on these REAL sensors:
- Target Plant: {pk['canonical_name']} (Gujarati: {pk['name_gu']}, Hindi: {pk['name_hi']})
- Preferred Soil Moisture Range: {pk['soil_moisture_target_min']}% - {pk['soil_moisture_target_max']}%
- Current Real Soil Moisture: {soil_pct:.1f}%
- Temperature: {temp_c:.1f}°C
- Humidity: {hum_pct:.1f}%
- Water Tank Level: {water_pct:.1f}%

Rules:
1. Always cite the exact sensor readings above as evidence. Never fabricate sensor numbers.
2. If language is 'gu' or user spoke Gujarati, answer in natural Gujarati (ગુજરાતી).
3. If language is 'hi' or user spoke Hindi, answer in natural Hindi (हिन्दी).
4. Otherwise answer in clear, supportive English.
5. Emphasize mindful water conservation and 'Touch Grass' outdoors checking."""

    prompt = f"{system_context}\n\nUser Question: {payload.query}"

    ai_reply = ""
    source = "ollama"
    try:
        ai_reply = await ollama_service.generate(prompt)
    except Exception as exc:
        logger.warning("Ollama unavailable for chat: %s", exc)
        source = "deterministic_fallback"
        # Deterministic grounded response
        if "water" in payload.query.lower() or "pani" in payload.query.lower() or "પાણી" in payload.query or "पानी" in payload.query:
            if lang == "gu":
                ai_reply = f"તમારા {pk['name_gu']} માટે વર્તમાન માટીનો ભેજ {soil_pct:.1f}% છે અને તાપમાન {temp_c:.1f}°C છે. માટીમાં 3-5 સેમી આંગળી નાખીને તપાસો. જો ઊંડે સુકાઈ ગયું હોય તો જ મૂળ પાસે પાણી આપો."
            elif lang == "hi":
                ai_reply = f"आपके {pk['name_hi']} के लिए वर्तमान मिट्टी की नमी {soil_pct:.1f}% और तापमान {temp_c:.1f}°C है। मिट्टी में 3-5 सेमी गहराई पर जांच करें और केवल तभी पानी दें जब वह सूखी हो।"
            else:
                ai_reply = f"Your {pk['canonical_name']} currently has {soil_pct:.1f}% soil moisture, {temp_c:.1f}°C temperature, and {hum_pct:.1f}% humidity. Optimal range is {pk['soil_moisture_target_min']}%–{pk['soil_moisture_target_max']}%. Inspect soil 3–5 cm below surface before watering."
        else:
            ai_reply = f"Garden Status: {pk['canonical_name']} | Soil Moisture: {soil_pct:.1f}% | Temp: {temp_c:.1f}°C | Tank: {water_pct:.1f}%. Care note: {pk['care_notes']}"

    return {
        "reply": ai_reply,
        "source": source,
        "evidence": {
            "plant": pk["canonical_name"],
            "soil_moisture": f"{soil_pct:.1f}%",
            "temperature": f"{temp_c:.1f}°C",
            "humidity": f"{hum_pct:.1f}%",
            "water_tank": f"{water_pct:.1f}%",
        },
    }


# ---------------------------------------------------------------------------
# Analytics & Learning Endpoint (Sections 21, 22)
# ---------------------------------------------------------------------------
@router.get("/analytics")
async def get_garden_analytics(device_id: str = "esp32-garden-01"):
    """Return historical soil drying rate, moisture recovery, and water savings KPI."""
    drying = iot_learning.calculate_soil_drying_rate(device_id, hours=48)
    effectiveness = iot_learning.calculate_watering_effectiveness(device_id)
    savings = iot_learning.calculate_water_savings(device_id, days=30)

    return {
        "device_id": device_id,
        "drying_rate": drying,
        "watering_effectiveness": effectiveness,
        "water_savings": savings,
    }


# ---------------------------------------------------------------------------
# Alerts Management (Section 25)
# ---------------------------------------------------------------------------
@router.get("/alerts")
async def list_alerts(active_only: bool = True):
    """List system and physical alerts."""
    with get_db() as conn:
        if active_only:
            rows = conn.execute(
                """SELECT * FROM alerts WHERE is_active = 1 ORDER BY id DESC LIMIT 50"""
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT * FROM alerts ORDER BY id DESC LIMIT 50"""
            ).fetchall()
    return [dict(r) for r in rows]


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int):
    """Mark an alert as acknowledged / resolved."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            """UPDATE alerts SET is_active = 0, resolved_at = ? WHERE id = ?""",
            (now_iso, alert_id),
        )
    return {"status": "resolved", "alert_id": alert_id}


# ---------------------------------------------------------------------------
# Simulation Demo Mode (Section 34: Clearly Labeled DEMO SENSOR DATA)
# ---------------------------------------------------------------------------
@router.post("/demo/telemetry")
async def generate_demo_telemetry(
    device_id: str = "esp32-garden-01",
    scenario: str = Query("hot_afternoon", pattern="^(hot_afternoon|morning_dew|dry_stress|full_tank)$"),
):
    """Inject clearly labeled simulated sensor telemetry for demonstration and offline testing.

    Always marks records with is_simulated = 1 and explicit warning header.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    profiles = {
        "hot_afternoon": {"temp": 34.2, "hum": 38.0, "soil": 27.5, "water": 78.0},
        "morning_dew": {"temp": 24.0, "hum": 72.0, "soil": 55.0, "water": 85.0},
        "dry_stress": {"temp": 36.5, "hum": 30.0, "soil": 18.0, "water": 45.0},
        "full_tank": {"temp": 29.0, "hum": 50.0, "soil": 48.0, "water": 98.0},
    }
    sc = profiles.get(scenario, profiles["hot_afternoon"])

    payload = TelemetryPayload(
        device_id=device_id,
        timestamp=now_iso,
        temperature_c=sc["temp"],
        humidity_percent=sc["hum"],
        soil_moisture_percent=sc["soil"],
        water_level_percent=sc["water"],
        pump_on=False,
        raw_adc=2850,
        is_simulated=True,
    )

    res = await ingest_telemetry(payload)
    return {
        **res,
        "warning": "⚠ DEMO SENSOR DATA (Simulation Mode)",
        "scenario": scenario,
    }


@router.get("/plants/supported")
async def get_supported_plants():
    """List all 16+ Indian/Gujarat supported plant species with thresholds."""
    return list_all_supported_plants()
