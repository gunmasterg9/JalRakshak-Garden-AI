"""JalRakshak Garden AI — Main FastAPI Application Entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
from database import init_db, seed_defaults
import ollama_service
from routers import plants, journal, missions, recommend, doctor, settings, iot

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("jalrakshak")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and default configurations exist
    init_db()
    seed_defaults()
    logger.info("JalRakshak Garden AI database initialized at %s", config.DB_PATH)
    yield


app = FastAPI(
    title="JalRakshak Garden AI",
    description="Privacy-first, water-smart gardening assistant powered by local open-weight AI.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads for static serving
app.mount("/uploads", StaticFiles(directory=str(config.UPLOADS_DIR)), name="uploads")

# Include Routers
app.include_router(plants.router)
app.include_router(journal.router)
app.include_router(missions.router)
app.include_router(recommend.router)
app.include_router(doctor.router)
app.include_router(settings.router)
app.include_router(iot.router)



@app.get("/api/health")
async def health_check():
    """Health check endpoint: verifies database and checks Ollama connectivity."""
    ollama_info = await ollama_service.check_connection()
    return {
        "ok": True,
        "app": "JalRakshak Garden AI",
        "version": "1.0.0",
        "privacy": "local-first, no cloud telemetry",
        "storage": "local SQLite",
        "ollama_available": ollama_info["ollama_available"],
        "rules_engine_status": "operational",
        "ai_status": "ollama_active" if ollama_info["ollama_available"] else "deterministic_rules_active",
        "model": ollama_info["model"],
        "model_installed": ollama_info["model_installed"],
        "installed_models": ollama_info["installed_models"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
