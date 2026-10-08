"""JalRakshak Garden AI — SQLite database layer."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Generator

from config import DB_PATH


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Yield a database connection, auto-committing on success."""
    conn = _get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create all tables if they do not exist."""
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS plants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            species TEXT DEFAULT '',
            photo_path TEXT DEFAULT '',
            location TEXT DEFAULT '',
            planting_date TEXT DEFAULT '',
            soil_type TEXT DEFAULT 'loamy',
            sunlight TEXT DEFAULT 'full sun',
            container_type TEXT DEFAULT 'ground',
            age_months INTEGER DEFAULT 0,
            watering_preference TEXT DEFAULT 'moderate',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS journal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id INTEGER,
            entry_type TEXT NOT NULL DEFAULT 'note',
            title TEXT DEFAULT '',
            note TEXT NOT NULL,
            photo_path TEXT DEFAULT '',
            moisture TEXT DEFAULT '',
            recommendation TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS missions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT DEFAULT 'garden',
            difficulty TEXT DEFAULT 'easy',
            duration_minutes INTEGER DEFAULT 5,
            outdoor_required INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS mission_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mission_id INTEGER NOT NULL,
            completed_at TEXT NOT NULL,
            notes TEXT DEFAULT '',
            FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS watering_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id INTEGER NOT NULL,
            watered_at TEXT NOT NULL,
            amount_ml INTEGER DEFAULT 0,
            method TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS diagnoses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id INTEGER,
            photo_path TEXT DEFAULT '',
            symptoms TEXT DEFAULT '',
            diagnosis_json TEXT DEFAULT '{}',
            source TEXT DEFAULT 'ai',
            created_at TEXT NOT NULL,
            FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE SET NULL
        );

        -- IoT Hardware & Sensor Subsystem
        CREATE TABLE IF NOT EXISTS devices (
            device_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            device_type TEXT DEFAULT 'esp32',
            ip_address TEXT DEFAULT '',
            status TEXT DEFAULT 'offline',
            mode TEXT DEFAULT 'AI_RECOMMEND',
            pump_state INTEGER DEFAULT 0,
            last_seen TEXT,
            config_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            sensor_type TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            quality TEXT DEFAULT 'good',
            is_simulated INTEGER DEFAULT 0,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS soil_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            plant_id INTEGER,
            timestamp TEXT NOT NULL,
            raw_adc INTEGER,
            moisture_percent REAL NOT NULL,
            dry_cal INTEGER DEFAULT 3200,
            wet_cal INTEGER DEFAULT 1400,
            is_simulated INTEGER DEFAULT 0,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS water_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            level_percent REAL NOT NULL,
            status TEXT NOT NULL,
            notes TEXT DEFAULT '',
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS pump_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            trigger_source TEXT NOT NULL,
            runtime_seconds REAL DEFAULT 0.0,
            estimated_liters REAL DEFAULT 0.0,
            measured_liters REAL DEFAULT 0.0,
            reason TEXT DEFAULT '',
            success INTEGER DEFAULT 1,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS watering_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id INTEGER,
            device_id TEXT,
            timestamp TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            why TEXT NOT NULL,
            evidence_json TEXT DEFAULT '{}',
            confidence REAL DEFAULT 0.0,
            action TEXT NOT NULL,
            source TEXT DEFAULT 'deterministic'
        );

        CREATE TABLE IF NOT EXISTS ai_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id INTEGER,
            device_id TEXT,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            model TEXT NOT NULL,
            duration_ms INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            plant_id INTEGER,
            severity TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            message TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            resolved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS device_calibrations (
            device_id TEXT PRIMARY KEY,
            dry_value INTEGER DEFAULT 3200,
            wet_value INTEGER DEFAULT 1400,
            status TEXT DEFAULT 'uncalibrated',
            updated_at TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time ON sensor_readings(device_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_soil_readings_time ON soil_readings(device_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_pump_events_time ON pump_events(device_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);
        """)

        # Seed missions if empty
        count = conn.execute("SELECT COUNT(*) FROM missions").fetchone()[0]
        if count == 0:
            missions = [
                ("Check soil moisture", "Stick your finger 2-3 cm into the soil near your plants. Note whether it feels dry, moist, or wet.", "observation", "easy", 3, 1),
                ("Inspect leaf undersides", "Turn over 3-5 leaves on different plants. Look for tiny insects, eggs, or discoloration.", "observation", "easy", 5, 1),
                ("Remove dead leaves", "Walk through your garden and gently remove any yellowed or dead leaves. Compost them if possible.", "maintenance", "easy", 10, 1),
                ("Add mulch", "Spread a 3-5 cm layer of organic mulch around the base of one plant, keeping it away from the stem.", "maintenance", "medium", 15, 1),
                ("Observe pollinators", "Sit quietly near flowering plants for 5 minutes. Note any bees, butterflies, or birds you see.", "observation", "easy", 5, 1),
                ("Collect rainwater", "If it has rained, check and safely store collected rainwater for future garden use.", "conservation", "easy", 10, 1),
                ("Ten-minute garden time", "Spend 10 uninterrupted minutes tending your garden. Weed, prune, or simply observe.", "wellness", "easy", 10, 1),
                ("Water deeply", "Choose one plant and water it slowly and deeply at the base until the root zone is evenly moist.", "watering", "easy", 5, 1),
                ("Check drainage", "After watering, observe how quickly water drains from the soil surface. Note any pooling.", "observation", "easy", 5, 1),
                ("Morning garden walk", "Take a calm walk through your garden first thing in the morning. Notice any overnight changes.", "wellness", "easy", 10, 1),
                ("Photograph plant progress", "Take a photo of one plant to track its growth over time. Compare with previous photos if available.", "tracking", "easy", 3, 1),
                ("Clean a pot or tool", "Wash one gardening pot or tool to keep your equipment in good condition.", "maintenance", "easy", 10, 1),
                ("Plant something new", "Sow a seed, transplant a cutting, or add a new plant to your garden.", "planting", "medium", 20, 1),
                ("Taste test", "If you grow edible herbs or vegetables, taste a small leaf or fruit from your garden.", "harvest", "easy", 2, 1),
            ]
            conn.executemany(
                "INSERT INTO missions (title, description, category, difficulty, duration_minutes, outdoor_required) VALUES (?, ?, ?, ?, ?, ?)",
                missions,
            )


# Seed default settings
def seed_defaults() -> None:
    """Insert default settings and default primary device if missing."""
    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    defaults = {
        "language": "en",
        "region": "gujarat",
        "temperature_unit": "celsius",
        "date_format": "en-IN",
        "ollama_model": "",
        "theme": "light",
        "iot_mode": "AI_RECOMMEND",
        "max_pump_runtime": "60",
        "min_water_level": "15",
    }
    with get_db() as conn:
        for key, value in defaults.items():
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, value),
            )

        # Seed default ESP32 controller
        conn.execute(
            """INSERT OR IGNORE INTO devices
            (device_id, name, device_type, ip_address, status, mode, pump_state, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "esp32-garden-01",
                "Terrace ESP32 Controller",
                "esp32",
                "192.168.1.150",
                "offline",
                "AI_RECOMMEND",
                0,
                now_iso,
                now_iso,
            ),
        )

        # Seed default calibration record
        conn.execute(
            """INSERT OR IGNORE INTO device_calibrations
            (device_id, dry_value, wet_value, status, updated_at)
            VALUES (?, ?, ?, ?, ?)""",
            ("esp32-garden-01", 3200, 1400, "calibrated", now_iso),
        )

