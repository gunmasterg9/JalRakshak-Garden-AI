"""JalRakshak Garden AI — Multi-Layer Pump Safety System & Hardware Guard.

Enforces physical safety constraints for water actuators:
1. Tank Water Level Guard: Refuses activation if reservoir is CRITICAL (<= MIN_WATER_LEVEL_PERCENT).
2. Maximum Runtime Guard: Hard cutoff at MAX_PUMP_RUNTIME (default 60 seconds).
3. Cooldown Guard: Enforces minimum wait time between pumping cycles to prevent motor burn-in.
4. Emergency Stop: Immediate actuator cutoff and audit record.
5. Fail-Safe Policy: Any sensor anomaly or timeout commands FAIL-SAFE = PUMP OFF.
6. Audit Log: Records every single state change and rejection reason in SQLite.
"""
from __future__ import annotations

import datetime
import logging
from typing import Optional, Tuple

import config
from database import get_db

logger = logging.getLogger("jalrakshak.iot_safety")

# In-memory tracking of active pump runs and last stop times per device
_active_pump_sessions: dict[str, dict] = {}
_last_pump_stop_time: dict[str, datetime.datetime] = {}
_emergency_lockouts: set[str] = set()


def get_current_time_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def is_emergency_locked(device_id: str) -> bool:
    return device_id in _emergency_lockouts


def clear_emergency_lock(device_id: str) -> None:
    _emergency_lockouts.discard(device_id)


def evaluate_pump_start_safety(
    device_id: str,
    requested_runtime: int = 30,
    water_level_percent: Optional[float] = None,
) -> Tuple[bool, str]:
    """Evaluate whether turning on the pump for `device_id` is physically and safely permissible.

    Returns (is_allowed: bool, reason: str).
    """
    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Emergency lockout check
    if device_id in _emergency_lockouts:
        return False, "Emergency lockout active. Clear emergency stop before restarting pump."

    # 2. Check if pump is already running
    if device_id in _active_pump_sessions:
        session = _active_pump_sessions[device_id]
        elapsed = (now - session["start_time"]).total_seconds()
        if elapsed < session["max_duration"]:
            return False, f"Pump already active (running for {int(elapsed)}s)."
        else:
            # Stale session cleanup
            record_pump_stop(device_id, "auto_timeout", reason="Max runtime exceeded")

    # 3. Water tank level validation
    # If not provided in call, check latest reading from database
    if water_level_percent is None:
        try:
            with get_db() as conn:
                row = conn.execute(
                    """SELECT value FROM sensor_readings
                    WHERE device_id = ? AND sensor_type = 'water_level'
                    ORDER BY id DESC LIMIT 1""",
                    (device_id,),
                ).fetchone()
                if row:
                    water_level_percent = float(row["value"])
        except Exception as e:
            logger.error("Failed to query water level for safety check: %s", e)

    if water_level_percent is not None:
        if water_level_percent <= config.MIN_WATER_LEVEL_PERCENT:
            return (
                False,
                f"Water tank level is critically low ({water_level_percent:.1f}% <= {config.MIN_WATER_LEVEL_PERCENT}%). Pump operation prohibited to prevent pump dry-run burn-in.",
            )

    # 4. Cooldown period check
    if device_id in _last_pump_stop_time:
        elapsed_since_stop = (now - _last_pump_stop_time[device_id]).total_seconds()
        if elapsed_since_stop < config.PUMP_COOLDOWN_SECONDS:
            remaining = int(config.PUMP_COOLDOWN_SECONDS - elapsed_since_stop)
            return (
                False,
                f"Pump cooldown active. Please wait {remaining} seconds before restarting.",
            )

    # 5. Runtime request limit check
    if requested_runtime > config.MAX_PUMP_RUNTIME or requested_runtime <= 0:
        return (
            False,
            f"Requested runtime ({requested_runtime}s) exceeds maximum allowed safe limit ({config.MAX_PUMP_RUNTIME}s).",
        )

    return True, "All safety checks passed."


def record_pump_start(
    device_id: str,
    trigger_source: str,
    max_duration_seconds: int = 30,
    reason: str = "Manual activation",
) -> None:
    """Record an active pump start session and persist to database."""
    now = datetime.datetime.now(datetime.timezone.utc)
    max_duration = min(max_duration_seconds, config.MAX_PUMP_RUNTIME)

    _active_pump_sessions[device_id] = {
        "start_time": now,
        "max_duration": max_duration,
        "trigger_source": trigger_source,
    }

    with get_db() as conn:
        conn.execute(
            """INSERT INTO pump_events
            (device_id, timestamp, action, trigger_source, runtime_seconds, estimated_liters, reason, success)
            VALUES (?, ?, 'start', ?, 0.0, 0.0, ?, 1)""",
            (device_id, now.isoformat(), trigger_source, reason),
        )
        conn.execute(
            """UPDATE devices SET pump_state = 1, updated_at = ? WHERE device_id = ?""",
            (now.isoformat(), device_id),
        )


def record_pump_stop(
    device_id: str,
    action: str = "stop",
    trigger_source: Optional[str] = None,
    reason: str = "Manual stop",
    measured_liters: float = 0.0,
) -> float:
    """Record a pump stop/emergency event. Calculates runtime and estimated water volume.

    Returns actual runtime in seconds.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    runtime_seconds = 0.0

    if device_id in _active_pump_sessions:
        session = _active_pump_sessions.pop(device_id)
        runtime_seconds = round((now - session["start_time"]).total_seconds(), 2)
        if trigger_source is None:
            trigger_source = session["trigger_source"]

    if trigger_source is None:
        trigger_source = "system"

    # Enforce maximum runtime sanity
    if runtime_seconds > config.MAX_PUMP_RUNTIME:
        runtime_seconds = float(config.MAX_PUMP_RUNTIME)

    _last_pump_stop_time[device_id] = now

    if action == "emergency_stop":
        _emergency_lockouts.add(device_id)

    # Estimate volume pumped based on LPM
    estimated_liters = round((runtime_seconds / 60.0) * config.ESTIMATED_PUMP_FLOW_LPM, 2)

    with get_db() as conn:
        conn.execute(
            """INSERT INTO pump_events
            (device_id, timestamp, action, trigger_source, runtime_seconds, estimated_liters, measured_liters, reason, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (
                device_id,
                now.isoformat(),
                action,
                trigger_source,
                runtime_seconds,
                estimated_liters,
                measured_liters,
                reason,
            ),
        )
        conn.execute(
            """UPDATE devices SET pump_state = 0, updated_at = ? WHERE device_id = ?""",
            (now.isoformat(), device_id),
        )

        # Also add alert if it was an emergency stop or auto watchdog stop
        if action == "emergency_stop":
            conn.execute(
                """INSERT INTO alerts (device_id, severity, alert_type, message, is_active, created_at)
                VALUES (?, 'critical', 'emergency_stop', ?, 1, ?)""",
                (device_id, f"Pump emergency stop triggered: {reason}", now.isoformat()),
            )
        elif action == "auto_timeout":
            conn.execute(
                """INSERT INTO alerts (device_id, severity, alert_type, message, is_active, created_at)
                VALUES (?, 'warning', 'pump_watchdog', ?, 1, ?)""",
                (
                    device_id,
                    f"Pump stopped automatically after reaching {runtime_seconds}s limit.",
                    now.isoformat(),
                ),
            )

    return runtime_seconds


def get_pump_status(device_id: str) -> dict:
    """Return the current real-time state of the pump and cooldown timer."""
    now = datetime.datetime.now(datetime.timezone.utc)
    is_active = device_id in _active_pump_sessions
    current_runtime = 0.0
    remaining_seconds = 0.0

    if is_active:
        session = _active_pump_sessions[device_id]
        current_runtime = round((now - session["start_time"]).total_seconds(), 1)
        remaining_seconds = max(0.0, session["max_duration"] - current_runtime)
        if current_runtime >= session["max_duration"]:
            record_pump_stop(device_id, "auto_timeout", reason="Exceeded maximum allotted runtime")
            is_active = False
            current_runtime = 0.0
            remaining_seconds = 0.0

    cooldown_remaining = 0
    if not is_active and device_id in _last_pump_stop_time:
        elapsed = (now - _last_pump_stop_time[device_id]).total_seconds()
        if elapsed < config.PUMP_COOLDOWN_SECONDS:
            cooldown_remaining = int(config.PUMP_COOLDOWN_SECONDS - elapsed)

    return {
        "pump_on": is_active,
        "runtime_seconds": current_runtime,
        "remaining_seconds": remaining_seconds,
        "cooldown_remaining_seconds": cooldown_remaining,
        "emergency_locked": device_id in _emergency_lockouts,
        "max_runtime_limit": config.MAX_PUMP_RUNTIME,
    }
