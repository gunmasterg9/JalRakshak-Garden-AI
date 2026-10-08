"""JalRakshak — Plants CRUD router."""
from __future__ import annotations

import base64
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from config import MAX_IMAGE_SIZE_MB, UPLOADS_DIR
from database import get_db
from models import PlantCreate, PlantUpdate

router = APIRouter(prefix="/api/plants", tags=["plants"])


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


@router.get("")
def list_plants(search: str = "", soil_type: str = "", sunlight: str = ""):
    """List all plants, with optional search and filters."""
    query = "SELECT * FROM plants WHERE 1=1"
    params: list = []
    if search:
        query += " AND (name LIKE ? OR species LIKE ? OR location LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
    if soil_type:
        query += " AND soil_type = ?"
        params.append(soil_type)
    if sunlight:
        query += " AND sunlight = ?"
        params.append(sunlight)
    query += " ORDER BY updated_at DESC"
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


@router.post("", status_code=201)
def create_plant(plant: PlantCreate):
    """Create a new plant entry."""
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO plants
               (name, species, location, planting_date, soil_type, sunlight,
                container_type, age_months, watering_preference, notes, photo_path,
                created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)""",
            (
                plant.name, plant.species, plant.location, plant.planting_date,
                plant.soil_type, plant.sunlight, plant.container_type,
                plant.age_months, plant.watering_preference, plant.notes,
                now, now,
            ),
        )
        row = conn.execute("SELECT * FROM plants WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.get("/{plant_id}")
def get_plant(plant_id: int):
    """Get a single plant by ID, including watering history and journal entries."""
    with get_db() as conn:
        plant = conn.execute("SELECT * FROM plants WHERE id = ?", (plant_id,)).fetchone()
        if not plant:
            raise HTTPException(404, "Plant not found.")
        watering = conn.execute(
            "SELECT * FROM watering_log WHERE plant_id = ? ORDER BY watered_at DESC LIMIT 20",
            (plant_id,),
        ).fetchall()
        entries = conn.execute(
            "SELECT * FROM journal WHERE plant_id = ? ORDER BY created_at DESC LIMIT 20",
            (plant_id,),
        ).fetchall()
        diagnoses = conn.execute(
            "SELECT * FROM diagnoses WHERE plant_id = ? ORDER BY created_at DESC LIMIT 10",
            (plant_id,),
        ).fetchall()
    result = dict(plant)
    result["watering_history"] = [dict(r) for r in watering]
    result["journal_entries"] = [dict(r) for r in entries]
    result["diagnoses"] = [dict(r) for r in diagnoses]
    return result


@router.put("/{plant_id}")
def update_plant(plant_id: int, updates: PlantUpdate):
    """Update a plant's fields."""
    fields = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(400, "No fields to update.")
    fields["updated_at"] = _now()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [plant_id]
    with get_db() as conn:
        conn.execute(f"UPDATE plants SET {set_clause} WHERE id = ?", values)
        row = conn.execute("SELECT * FROM plants WHERE id = ?", (plant_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Plant not found.")
    return dict(row)


@router.delete("/{plant_id}", status_code=204)
def delete_plant(plant_id: int):
    """Delete a plant and its associated data."""
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM plants WHERE id = ?", (plant_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Plant not found.")
        conn.execute("DELETE FROM plants WHERE id = ?", (plant_id,))


@router.post("/{plant_id}/photo")
async def upload_plant_photo(plant_id: int, file: UploadFile = File(...)):
    """Upload a photo for a plant."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")
    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"Image must be under {MAX_IMAGE_SIZE_MB} MB.")
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"plant_{plant_id}_{int(datetime.now().timestamp())}.{ext}"
    filepath = UPLOADS_DIR / filename
    filepath.write_bytes(data)
    with get_db() as conn:
        conn.execute(
            "UPDATE plants SET photo_path = ?, updated_at = ? WHERE id = ?",
            (str(filename), _now(), plant_id),
        )
        row = conn.execute("SELECT * FROM plants WHERE id = ?", (plant_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Plant not found.")
    return dict(row)


@router.post("/{plant_id}/water")
def log_watering(plant_id: int, amount_ml: int = 0, method: str = "", notes: str = ""):
    """Log a watering event for a plant."""
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM plants WHERE id = ?", (plant_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Plant not found.")
        now = _now()
        conn.execute(
            "INSERT INTO watering_log (plant_id, watered_at, amount_ml, method, notes) VALUES (?, ?, ?, ?, ?)",
            (plant_id, now, amount_ml, method, notes),
        )
    return {"status": "recorded", "plant_id": plant_id, "watered_at": now}
