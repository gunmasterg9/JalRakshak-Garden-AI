"""JalRakshak — Missions router."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone, date

from fastapi import APIRouter, HTTPException

from database import get_db
from models import MissionComplete

router = APIRouter(prefix="/api/missions", tags=["missions"])


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _today_str() -> str:
    return date.today().isoformat()


def _daily_mission_id(today: str, total_missions: int) -> int:
    """Deterministically pick a mission for today based on the date hash."""
    if total_missions == 0:
        return 1
    h = int(hashlib.md5(today.encode()).hexdigest(), 16)
    return (h % total_missions) + 1


@router.get("/today")
def get_today_mission():
    """Get today's daily mission and completion status."""
    today = _today_str()
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM missions").fetchone()[0]
        if total == 0:
            return {"mission": None, "completed": False, "streak": 0}

        mission_id = _daily_mission_id(today, total)
        mission = conn.execute("SELECT * FROM missions WHERE id = ?", (mission_id,)).fetchone()
        if not mission:
            # Fallback to first mission
            mission = conn.execute("SELECT * FROM missions ORDER BY id LIMIT 1").fetchone()

        completed = conn.execute(
            "SELECT id FROM mission_completions WHERE mission_id = ? AND DATE(completed_at) = ?",
            (mission["id"], today),
        ).fetchone()

        # Calculate streak
        streak = 0
        check_date = date.today()
        while True:
            day_str = check_date.isoformat()
            day_mission_id = _daily_mission_id(day_str, total)
            was_done = conn.execute(
                "SELECT id FROM mission_completions WHERE mission_id = ? AND DATE(completed_at) = ?",
                (day_mission_id, day_str),
            ).fetchone()
            if was_done:
                streak += 1
                check_date = date.fromordinal(check_date.toordinal() - 1)
            else:
                break
            if streak > 365:
                break

    return {
        "mission": dict(mission),
        "completed": completed is not None,
        "streak": streak,
        "date": today,
    }


@router.get("")
def list_missions():
    """List all available missions."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM missions ORDER BY id").fetchall()
    return [dict(r) for r in rows]


@router.post("/{mission_id}/complete", status_code=201)
def complete_mission(mission_id: int, body: MissionComplete):
    """Record a mission completion."""
    now = _now()
    today = _today_str()
    with get_db() as conn:
        mission = conn.execute("SELECT * FROM missions WHERE id = ?", (mission_id,)).fetchone()
        if not mission:
            raise HTTPException(404, "Mission not found.")

        already = conn.execute(
            "SELECT id FROM mission_completions WHERE mission_id = ? AND DATE(completed_at) = ?",
            (mission_id, today),
        ).fetchone()
        if already:
            return {"status": "already_completed", "mission_id": mission_id, "date": today}

        conn.execute(
            "INSERT INTO mission_completions (mission_id, completed_at, notes) VALUES (?, ?, ?)",
            (mission_id, now, body.notes),
        )

    # Return updated today info
    return get_today_mission()


@router.get("/history")
def mission_history(days: int = 30):
    """Get mission completion history for the last N days."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT mc.*, m.title, m.category
               FROM mission_completions mc
               JOIN missions m ON mc.mission_id = m.id
               WHERE mc.completed_at >= datetime('now', ?)
               ORDER BY mc.completed_at DESC""",
            (f"-{min(days, 365)} days",),
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/badges")
def get_badges():
    """Calculate achievement badges based on completion history."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM mission_completions").fetchone()[0]
        unique_missions = conn.execute(
            "SELECT COUNT(DISTINCT mission_id) FROM mission_completions"
        ).fetchone()[0]
        categories_done = conn.execute(
            "SELECT COUNT(DISTINCT m.category) FROM mission_completions mc JOIN missions m ON mc.mission_id = m.id"
        ).fetchone()[0]

    badges = []
    if total >= 1:
        badges.append({"name": "First Step", "icon": "🌱", "description": "Completed your first mission"})
    if total >= 7:
        badges.append({"name": "Week Warrior", "icon": "🌿", "description": "7 missions completed"})
    if total >= 30:
        badges.append({"name": "Monthly Green", "icon": "🌳", "description": "30 missions completed"})
    if total >= 100:
        badges.append({"name": "Garden Master", "icon": "🏆", "description": "100 missions completed"})
    if unique_missions >= 5:
        badges.append({"name": "Explorer", "icon": "🔍", "description": "Tried 5 different missions"})
    if unique_missions >= 10:
        badges.append({"name": "All-Rounder", "icon": "⭐", "description": "Tried 10 different missions"})
    if categories_done >= 3:
        badges.append({"name": "Diverse Gardener", "icon": "🌈", "description": "Completed missions in 3+ categories"})

    return {
        "badges": badges,
        "total_completions": total,
        "unique_missions": unique_missions,
    }
