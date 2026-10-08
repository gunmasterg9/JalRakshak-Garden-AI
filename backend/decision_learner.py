"""JalRakshak Garden AI — Decision Learning Engine.

Tracks user responses (approvals, rejections, manual overrides) to AI watering
recommendations and evaluates real-world botanical and soil responses 12–24h later:
- User rejected recommendation -> Soil remained healthy? => Learn recommendation was premature.
- User approved recommendation -> Optimal moisture recovery achieved? => Reinforce runtime.
- User rejected recommendation -> Soil entered severe wilt? => Validate recommendation sensitivity.
"""
from __future__ import annotations

import datetime
import json
import logging
from typing import Any, Optional

from database import get_db
import garden_memory
from plant_knowledge import lookup_plant_knowledge

logger = logging.getLogger("jalrakshak.decision_learner")


def record_user_decision(
    proposal_id: str,
    decision: str,  # "approved", "dismissed", "manual_override"
    plant_name: str,
    zone_id: Optional[str] = "zone-1",
    device_id: Optional[str] = "esp32-garden-01",
    initial_moisture: float = 30.0,
    recommended_runtime: int = 25,
) -> int:
    """Record a user action on an irrigation recommendation for longitudinal learning."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO user_decision_outcomes
            (proposal_id, decision, plant_name, zone_id, device_id, initial_moisture, recommended_runtime, decision_timestamp, outcome_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')""",
            (
                proposal_id,
                decision.lower(),
                plant_name,
                zone_id,
                device_id,
                initial_moisture,
                recommended_runtime,
                now_iso,
            ),
        )
        outcome_id = cursor.lastrowid

    # Record in persistent garden memory
    garden_memory.record_memory_event(
        event_type=f"user_{decision.lower()}",
        source="USER",
        plant_id=plant_name,
        zone_id=zone_id,
        data={
            "proposal_id": proposal_id,
            "decision": decision,
            "plant_name": plant_name,
            "initial_moisture": initial_moisture,
            "recommended_runtime": recommended_runtime,
            "summary": f"User {decision} {recommended_runtime}s watering for {plant_name} (initial soil: {initial_moisture:.1f}%)",
        },
    )

    logger.info("Recorded user decision #%d: %s for proposal %s", outcome_id, decision, proposal_id)
    return outcome_id or 0


def evaluate_pending_decision_outcomes() -> list[dict[str, Any]]:
    """Evaluate decisions made > 6 hours ago to observe how soil and plant actually reacted."""
    now = datetime.datetime.now(datetime.timezone.utc)
    threshold_dt = now - datetime.timedelta(hours=6)
    threshold_iso = threshold_dt.isoformat()

    evaluated_results = []

    with get_db() as conn:
        pending_rows = conn.execute(
            """SELECT id, proposal_id, decision, plant_name, zone_id, device_id, initial_moisture, recommended_runtime, decision_timestamp
            FROM user_decision_outcomes
            WHERE outcome_status = 'pending' AND decision_timestamp <= ?""",
            (threshold_iso,),
        ).fetchall()

        for row in pending_rows:
            dev_id = row["device_id"]
            p_name = row["plant_name"]
            decision = row["decision"]
            init_moist = float(row["initial_moisture"])
            dec_time = row["decision_timestamp"]

            # Query subsequent soil reading
            soil_row = conn.execute(
                """SELECT moisture_percent FROM soil_readings
                WHERE device_id = ? AND timestamp >= ?
                ORDER BY timestamp DESC LIMIT 1""",
                (dev_id, dec_time),
            ).fetchone()

            subsequent_moisture = float(soil_row["moisture_percent"]) if soil_row else init_moist

            pk = lookup_plant_knowledge(p_name)
            target_min = pk["soil_moisture_target_min"]

            insight = ""
            if decision == "approved":
                if subsequent_moisture >= target_min:
                    insight = f"Approval verified: soil recovered to {subsequent_moisture:.1f}% (above target {target_min}%)."
                else:
                    insight = f"Under-recovery: soil only reached {subsequent_moisture:.1f}%. Consider increasing runtime."
            elif decision == "dismissed":
                if subsequent_moisture >= target_min * 0.85:
                    insight = f"User dismissal validated: soil stayed stable at {subsequent_moisture:.1f}% without irrigation. Threshold was overly eager."
                else:
                    insight = f"User dismissed, but soil dropped to critical {subsequent_moisture:.1f}%. Recommendation was warranted."

            conn.execute(
                """UPDATE user_decision_outcomes
                SET outcome_status = 'evaluated', evaluated_at = ?, moisture_after_12h = ?, feedback_insight = ?
                WHERE id = ?""",
                (now.isoformat(), subsequent_moisture, insight, row["id"]),
            )

            evaluated_results.append({
                "id": row["id"],
                "plant_name": p_name,
                "decision": decision,
                "insight": insight,
                "subsequent_moisture": subsequent_moisture,
            })

    return evaluated_results


def get_learned_decision_insights(plant_name: Optional[str] = None, limit: int = 5) -> list[str]:
    """Retrieve historical human feedback insights to ground future AI decisions."""
    with get_db() as conn:
        if plant_name:
            rows = conn.execute(
                """SELECT decision, plant_name, initial_moisture, feedback_insight
                FROM user_decision_outcomes
                WHERE plant_name = ? AND outcome_status = 'evaluated' AND feedback_insight != ''
                ORDER BY id DESC LIMIT ?""",
                (plant_name, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT decision, plant_name, initial_moisture, feedback_insight
                FROM user_decision_outcomes
                WHERE outcome_status = 'evaluated' AND feedback_insight != ''
                ORDER BY id DESC LIMIT ?""",
                (limit,),
            ).fetchall()

    return [f"Historical Feedback on {r['plant_name']}: {r['feedback_insight']}" for r in rows]
