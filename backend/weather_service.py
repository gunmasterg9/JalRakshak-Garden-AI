"""JalRakshak Garden AI — Weather Forecast & Rain Guard Service.

Connects to the open, keyless Open-Meteo API to fetch local forecasts,
precipitation probabilities, and heatwave warnings.
Includes Rain Guard logic to automatically postpone irrigation when rain is imminent.
"""
from __future__ import annotations

import datetime
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger("jalrakshak.weather")

# Default coordinates: Ahmedabad, Gujarat (can be configured via settings)
DEFAULT_LAT = 23.0225
DEFAULT_LON = 72.5714

# Cache forecast for 15 minutes to respect rate limits and reduce unnecessary network calls
_cached_forecast: Optional[dict[str, Any]] = None
_cache_timestamp: Optional[datetime.datetime] = None
CACHE_TTL_SECONDS = 900


async def get_weather_forecast(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> dict[str, Any]:
    """Fetch current conditions and 24-hour precipitation forecast from Open-Meteo.

    Works without API keys. Returns structured forecast and rain guard evaluation.
    """
    global _cached_forecast, _cache_timestamp
    now = datetime.datetime.now(datetime.timezone.utc)

    if _cached_forecast and _cache_timestamp and (now - _cache_timestamp).total_seconds() < CACHE_TTL_SECONDS:
        return _cached_forecast

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&"
        f"hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation&"
        f"forecast_days=2&timezone=auto"
    )

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0, connect=2.0)) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        current = data.get("current", {})
        hourly = data.get("hourly", {})

        # Analyze next 24 hours for rain
        precip_next_24h_mm = 0.0
        max_rain_prob_next_24h = 0
        hourly_precip = hourly.get("precipitation", [])[:24]
        hourly_probs = hourly.get("precipitation_probability", [])[:24]

        if hourly_precip:
            precip_next_24h_mm = round(sum(p for p in hourly_precip if p is not None), 1)
        if hourly_probs:
            max_rain_prob_next_24h = max((p for p in hourly_probs if p is not None), default=0)

        # Rain Guard decision
        rain_guard_active = precip_next_24h_mm >= 2.0 or max_rain_prob_next_24h >= 60
        heatwave_warning = current.get("temperature_2m", 28.0) >= 38.0

        forecast = {
            "source": "Open-Meteo (Live)",
            "latitude": lat,
            "longitude": lon,
            "current": {
                "temperature_c": current.get("temperature_2m", 30.0),
                "humidity_percent": current.get("relative_humidity_2m", 50.0),
                "precipitation_mm": current.get("precipitation", 0.0),
                "wind_speed_kmh": current.get("wind_speed_10m", 10.0),
                "weather_code": current.get("weather_code", 0),
            },
            "rain_guard": {
                "active": rain_guard_active,
                "expected_rain_mm": precip_next_24h_mm,
                "max_probability_percent": max_rain_prob_next_24h,
                "advisory": (
                    f"🌧️ Rain Guard Active: {precip_next_24h_mm}mm rain ({max_rain_prob_next_24h}% chance) expected in next 24h. Postpone automated watering to conserve water."
                    if rain_guard_active
                    else "☀️ Clear Skies: No significant rainfall forecasted. Follow standard sensor guidance."
                ),
            },
            "heatwave_warning": heatwave_warning,
            "updated_at": now.isoformat(),
        }

        _cached_forecast = forecast
        _cache_timestamp = now
        return forecast

    except Exception as exc:
        logger.warning("Failed to fetch Open-Meteo weather forecast: %s. Using local climate baseline.", exc)
        # Return fallback baseline based on local Gujarat climatology
        fallback = {
            "source": "Local Climatology Baseline (Offline)",
            "latitude": lat,
            "longitude": lon,
            "current": {
                "temperature_c": 32.5,
                "humidity_percent": 45.0,
                "precipitation_mm": 0.0,
                "wind_speed_kmh": 12.0,
                "weather_code": 0,
            },
            "rain_guard": {
                "active": False,
                "expected_rain_mm": 0.0,
                "max_probability_percent": 10,
                "advisory": "☀️ Offline Climatology: Follow real soil moisture sensor guidance.",
            },
            "heatwave_warning": False,
            "updated_at": now.isoformat(),
        }
        return fallback
