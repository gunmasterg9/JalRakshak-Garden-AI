# JalRakshak Garden AI — REST API Documentation

Base URL: `http://127.0.0.1:8000`

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check, database status, and Ollama probe |
| `GET` | `/api/plants` | List all monitored plants (with search & filters) |
| `POST` | `/api/plants` | Register a new plant in local SQLite |
| `GET` | `/api/plants/{id}` | Detailed plant profile with watering & diagnosis history |
| `PUT` | `/api/plants/{id}` | Update plant metadata |
| `DELETE` | `/api/plants/{id}` | Delete a plant |
| `POST` | `/api/plants/{id}/photo` | Upload an image for a specific plant |
| `POST` | `/api/plants/{id}/water` | Record a watering event in the log |
| `POST` | `/api/recommend` | Generate a smart watering plan (AI or offline rules) |
| `POST` | `/api/analyze-photo` | AI Plant Doctor photo & symptoms diagnosis |
| `GET` | `/api/journal` | List field observations (supports filters) |
| `POST` | `/api/journal` | Create a new journal observation |
| `GET` | `/api/journal/stats` | Aggregated statistics for chart rendering |
| `GET` | `/api/missions/today` | Today's outdoor "Touch Grass" mission & streak |
| `POST` | `/api/missions/{id}/complete` | Record completion of a daily mission |
| `GET` | `/api/missions/badges` | Calculate unlocked achievement badges |
| `GET` | `/api/settings` | Read application settings & model options |
| `PUT` | `/api/settings` | Update settings (model name, language, region) |
