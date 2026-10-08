"""JalRakshak Garden AI — Configuration."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

DB_PATH = Path(os.getenv("JALRAKSHAK_DB", str(DATA_DIR / "jalrakshak.db")))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:12b")
AI_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "90"))
MAX_IMAGE_SIZE_MB = int(os.getenv("MAX_IMAGE_SIZE_MB", "7"))

# IoT Safety and Pump Controls
MAX_PUMP_RUNTIME = int(os.getenv("MAX_PUMP_RUNTIME", "60"))  # seconds
PUMP_COOLDOWN_SECONDS = int(os.getenv("PUMP_COOLDOWN_SECONDS", "120"))  # seconds
MIN_WATER_LEVEL_PERCENT = float(os.getenv("MIN_WATER_LEVEL_PERCENT", "15.0"))  # % cutoff
DEVICE_HEARTBEAT_TIMEOUT_SECONDS = int(os.getenv("DEVICE_HEARTBEAT_TIMEOUT_SECONDS", "60"))
DEVICE_DELAYED_TIMEOUT_SECONDS = int(os.getenv("DEVICE_DELAYED_TIMEOUT_SECONDS", "25"))

# Flow and water volume estimations
ESTIMATED_PUMP_FLOW_LPM = float(os.getenv("ESTIMATED_PUMP_FLOW_LPM", "2.0"))  # Liters/min default for mini pump
FLOW_SENSOR_PULSES_PER_LITER = float(os.getenv("FLOW_SENSOR_PULSES_PER_LITER", "450.0"))

# MQTT broker configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "garden")

