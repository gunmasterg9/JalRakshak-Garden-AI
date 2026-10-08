"""JalRakshak — Journal router."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import get_db
from models import JournalCreate

router = APIRouter(prefix="/api/journal", tags=["journal"])


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


@router.get("")
def list_journal(plant_id: int | None = None, entry_type: str = "", limit: int = 100):
    """List journal entries with optional plant and type filters."""
    query = "SELECT j.*, p.name as plant_name FROM journal j LEFT JOIN plants p ON j.plant_id = p.id WHERE 1=1"
    params: list = []
    if plant_id is not None:
        query += " AND j.plant_id = ?"
        params.append(plant_id)
    if entry_type:
        query += " AND j.entry_type = ?"
        params.append(entry_type)
    query += " ORDER BY j.created_at DESC LIMIT ?"
    params.append(min(limit, 500))
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


@router.post("", status_code=201)
def create_journal(entry: JournalCreate):
    """Create a new journal entry."""
    now = _now()
    with get_db() as conn:
        # Validate plant_id if provided
        if entry.plant_id:
            plant = conn.execute("SELECT id FROM plants WHERE id = ?", (entry.plant_id,)).fetchone()
            if not plant:
                raise HTTPException(404, "Referenced plant not found.")
        cur = conn.execute(
            """INSERT INTO journal
               (plant_id, entry_type, title, note, moisture, recommendation, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (entry.plant_id, entry.entry_type, entry.title, entry.note,
             entry.moisture, entry.recommendation, now),
        )
        row = conn.execute(
            "SELECT j.*, p.name as plant_name FROM journal j LEFT JOIN plants p ON j.plant_id = p.id WHERE j.id = ?",
            (cur.lastrowid,),
        ).fetchone()
    return dict(row)


@router.get("/stats")
def journal_stats():
    """Get journal statistics for charts."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as count FROM journal").fetchone()["count"]
        by_type = conn.execute(
            "SELECT entry_type, COUNT(*) as count FROM journal GROUP BY entry_type ORDER BY count DESC"
        ).fetchall()
        recent_7_days = conn.execute(
            "SELECT DATE(created_at) as date, COUNT(*) as count FROM journal WHERE created_at >= datetime('now', '-7 days') GROUP BY DATE(created_at) ORDER BY date"
        ).fetchall()
        by_plant = conn.execute(
            "SELECT p.name, COUNT(*) as count FROM journal j JOIN plants p ON j.plant_id = p.id GROUP BY j.plant_id ORDER BY count DESC LIMIT 10"
        ).fetchall()
    return {
        "total_entries": total,
        "by_type": [dict(r) for r in by_type],
        "last_7_days": [dict(r) for r in recent_7_days],
        "by_plant": [dict(r) for r in by_plant],
    }
