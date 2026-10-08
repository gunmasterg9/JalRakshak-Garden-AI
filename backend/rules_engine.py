"""JalRakshak Garden AI — Rule-based recommendation engine (offline fallback)."""
from __future__ import annotations

from models import GardenInput


# ---------------------------------------------------------------------------
# Regional plant database for Gujarat / hot-dry climates
# ---------------------------------------------------------------------------
REGIONAL_PLANTS: dict[str, dict] = {
    "tomato": {
        "name_gu": "ટામેટું",
        "name_hi": "टमाटर",
        "water_need": "moderate",
        "heat_tolerance": "moderate",
        "tip": "Keep moisture consistent to reduce stress and fruit cracking.",
    },
    "chilli": {
        "name_gu": "મરચું",
        "name_hi": "मिर्च",
        "water_need": "moderate",
        "heat_tolerance": "high",
        "tip": "Avoid leaving roots in waterlogged soil. Chillies prefer well-drained conditions.",
    },
    "okra": {
        "name_gu": "ભીંડા",
        "name_hi": "भिन्डी",
        "water_need": "moderate",
        "heat_tolerance": "high",
        "tip": "Okra thrives in heat but needs regular watering during flowering.",
    },
    "coriander": {
        "name_gu": "ધાણા",
        "name_hi": "धनिया",
        "water_need": "moderate",
        "heat_tolerance": "low",
        "tip": "Coriander bolts quickly in heat. Grow in partial shade during summer.",
    },
    "tulsi": {
        "name_gu": "તુલસી",
        "name_hi": "तुलसी",
        "water_need": "low",
        "heat_tolerance": "high",
        "tip": "Tulsi is drought-tolerant once established. Avoid overwatering.",
    },
    "neem": {
        "name_gu": "લીમડો",
        "name_hi": "नीम",
        "water_need": "low",
        "heat_tolerance": "very high",
        "tip": "Neem is extremely drought-tolerant. Water young trees; mature trees rarely need it.",
    },
    "marigold": {
        "name_gu": "ગલગોટા",
        "name_hi": "गेंदा",
        "water_need": "low",
        "heat_tolerance": "high",
        "tip": "Marigolds are hardy in heat. Deadhead spent flowers to encourage blooming.",
    },
    "mint": {
        "name_gu": "ફુદીનો",
        "name_hi": "पुदीना",
        "water_need": "high",
        "heat_tolerance": "moderate",
        "tip": "Keep soil consistently moist. Mint spreads aggressively; grow in pots.",
    },
    "rose": {
        "name_gu": "ગુલાબ",
        "name_hi": "गुलाब",
        "water_need": "moderate",
        "heat_tolerance": "moderate",
        "tip": "Water deeply at the base. Mulch to retain moisture and reduce heat stress.",
    },
    "aloe vera": {
        "name_gu": "કુંવારપાઠું",
        "name_hi": "एलोवेरा",
        "water_need": "very low",
        "heat_tolerance": "very high",
        "tip": "Allow soil to dry completely between waterings. Overwatering causes root rot.",
    },
    "curry leaf": {
        "name_gu": "કઢી લીમડો",
        "name_hi": "कढ़ी पत्ता",
        "water_need": "moderate",
        "heat_tolerance": "high",
        "tip": "Curry leaf trees prefer warm conditions. Water regularly but ensure good drainage.",
    },
    "lemon": {
        "name_gu": "લીંબુ",
        "name_hi": "नींबू",
        "water_need": "moderate",
        "heat_tolerance": "high",
        "tip": "Deep water weekly rather than frequent shallow watering. Mulch the root zone.",
    },
    "pepper": {
        "name_gu": "મરી",
        "name_hi": "काली मिर्च",
        "water_need": "moderate",
        "heat_tolerance": "moderate",
        "tip": "Avoid waterlogged roots. Consistent watering during fruiting improves yield.",
    },
}


def _find_plant_info(plant_name: str) -> dict | None:
    """Look up regional plant info by fuzzy name match."""
    name_lower = plant_name.lower()
    for key, info in REGIONAL_PLANTS.items():
        if key in name_lower or name_lower in key:
            return info
    # Check common aliases
    aliases = {
        "holy basil": "tulsi",
        "basil": "tulsi",
        "dhania": "coriander",
        "bhindi": "okra",
        "lady finger": "okra",
        "nimbu": "lemon",
        "pudina": "mint",
        "gulab": "rose",
    }
    for alias, key in aliases.items():
        if alias in name_lower:
            return REGIONAL_PLANTS.get(key)
    return None


def rule_recommendation(g: GardenInput) -> dict:
    """Generate a rule-based watering recommendation from garden inputs."""
    plant = g.plant.strip() or "your plant"
    moisture = g.moisture.lower()
    weather = g.weather.lower()
    soil = g.soil.lower()

    hot = any(x in weather for x in ["hot", "sunny", "heat", "dry"])
    very_dry = any(x in moisture for x in ["dry", "very dry"])
    wet = any(x in moisture for x in ["wet", "soggy", "waterlogged"])
    sandy = "sand" in soil
    clay = "clay" in soil
    is_pot = g.container_type.lower() in ("pot", "container", "balcony pots")

    # Determine action, timing, amount
    if wet:
        action = "Pause watering for now and check that excess water can drain away."
        timing = "Recheck the top 2–3 cm of soil later today."
        amount = "Do not add water while the root zone is still wet."
        water_today = False
    elif very_dry:
        action = "Water slowly at the base of the plant until the root zone is evenly moist, then let excess drain."
        timing = "Check again this evening; in hot weather, inspect soil daily rather than watering by the clock."
        amount = "Use a slow, deep watering instead of frequent shallow splashes."
        water_today = True
    elif hot:
        action = "Check soil near the roots. If the top 2–3 cm is dry, water at the base in the early morning."
        timing = "Early morning is usually best; check again during a heatwave."
        amount = "Water according to soil moisture, pot size, and plant stage, not a fixed universal volume."
        water_today = None  # check first
    else:
        action = "Check the top 2–3 cm of soil before watering. Water at the base only if it feels dry."
        timing = "Recheck tomorrow, or sooner if the weather becomes hot or windy."
        amount = "Aim for evenly moist soil with good drainage, not standing water."
        water_today = None

    tips = [
        "Add a 3–5 cm layer of clean organic mulch where appropriate, keeping it away from the stem.",
        "Water the soil, not the leaves, to reduce evaporation and some leaf-disease risks.",
        "Group plants with similar water needs and check pots more often than in-ground beds.",
    ]

    if sandy:
        tips[0] = "Sandy soil drains quickly; use mulch and check moisture more frequently, while avoiding runoff."
    if clay:
        tips[0] = "Clay soil holds water longer; water slowly and confirm drainage before adding more."
    if is_pot:
        tips.append("Potted plants dry out faster than garden beds. Check daily in hot weather.")
    if hot:
        tips.append("Consider watering in the early morning or late evening to reduce evaporation.")

    # Regional plant tips
    plant_info = _find_plant_info(plant)
    if plant_info:
        tips.append(plant_info["tip"])

    # Heat-specific Gujarat advice
    if hot and ("gujarat" in g.location.lower() or "india" in g.location.lower()):
        tips.append("In Gujarat's heat, mulching reduces soil temperature and evaporation significantly.")
        if g.recent_rainfall:
            tips.append("Recent rainfall noted — check soil before adding more water.")

    # Water-saving advice
    explanation_parts = []
    if water_today is True:
        explanation_parts.append(f"Your soil is {moisture}, so watering is recommended.")
    elif water_today is False:
        explanation_parts.append(f"Your soil is {moisture}, so hold off on watering.")
    else:
        explanation_parts.append("Check your soil moisture before deciding to water.")

    if hot:
        explanation_parts.append("Hot weather increases evaporation.")
    if is_pot:
        explanation_parts.append("Potted plants need more frequent checking.")

    return {
        "title": f"Water-smart plan for {plant}",
        "summary": action,
        "timing": timing,
        "amount": amount,
        "water_today": "yes" if water_today else "check" if water_today is None else "no",
        "suggested_time": "Early morning (6–8 AM)" if hot else "Morning",
        "checklist": tips[:5],
        "watch_for": "Wilting can result from both dry soil and waterlogged roots. Check the soil before deciding to water.",
        "explanation": " ".join(explanation_parts),
        "source": "offline rules",
        "confidence": "General guidance; verify conditions in your garden.",
        "missing_info": [],
    }


def symptom_assessment(symptoms: str, plant_name: str = "") -> dict:
    """Rule-based symptom assessment fallback when AI is unavailable."""
    symptoms_lower = symptoms.lower()
    result = {
        "plant_identification": plant_name or "Unknown",
        "observed_symptoms": symptoms,
        "possible_causes": "",
        "confidence": "low — symptom-based assessment without photo",
        "recommended_actions": "",
        "watering_advice": "",
        "prevention_tips": "",
        "needs_expert_review": True,
        "source": "offline symptom rules",
    }

    causes = []
    actions = []
    prevention = []

    if any(w in symptoms_lower for w in ["yellow", "yellowing", "chlorosis"]):
        causes.append("Overwatering, nutrient deficiency (nitrogen), or root stress")
        actions.append("Check soil moisture; reduce watering if soil is wet")
        actions.append("Consider a balanced organic fertilizer if soil is nutrient-poor")

    if any(w in symptoms_lower for w in ["wilt", "drooping", "limp"]):
        causes.append("Dry soil, heat stress, or root damage from overwatering")
        actions.append("Check soil: water if dry, improve drainage if wet")

    if any(w in symptoms_lower for w in ["spot", "brown", "black", "lesion"]):
        causes.append("Fungal infection, sunburn, or nutrient issues")
        actions.append("Remove affected leaves; improve air circulation")
        prevention.append("Avoid overhead watering; water at the base")

    if any(w in symptoms_lower for w in ["pest", "bug", "insect", "hole", "eaten"]):
        causes.append("Insect damage (common pests vary by region)")
        actions.append("Inspect leaf undersides; remove pests manually if possible")
        prevention.append("Encourage beneficial insects; avoid broad-spectrum pesticides")

    if any(w in symptoms_lower for w in ["curl", "curling"]):
        causes.append("Heat stress, water stress, or viral infection")
        actions.append("Provide shade during peak heat; ensure consistent watering")

    if any(w in symptoms_lower for w in ["mold", "mildew", "white", "powder"]):
        causes.append("Powdery mildew or fungal growth (often from humidity)")
        actions.append("Improve air circulation; avoid wetting leaves")
        prevention.append("Space plants adequately; prune for airflow")

    if not causes:
        causes.append("Unable to determine from description alone")
        actions.append("Take a clear photo and try AI analysis, or consult a local expert")

    result["possible_causes"] = "; ".join(causes)
    result["recommended_actions"] = "; ".join(actions)
    result["prevention_tips"] = "; ".join(prevention) if prevention else "Monitor regularly and maintain good garden hygiene."
    result["watering_advice"] = "Check soil moisture before watering. Adjust based on symptoms."

    return result


def evaluate_iot_watering_decision(
    plant_name: str,
    soil_moisture_percent: float,
    temperature_c: float,
    humidity_percent: float,
    water_level_percent: float,
    soil_type: str = "loamy",
    container_type: str = "pot",
    recent_history: list[dict] = None,
    hours_since_last_watering: float | None = None,
    recent_rainfall: bool = False,
) -> dict:
    """Evaluate watering recommendation using real sensor inputs, plant knowledge, and history.

    Produces deterministic recommendation (WATER_NOW, CHECK_SOIL, WAIT, DO_NOT_WATER)
    accompanied by Explainability: Recommendation, Why, Evidence, Confidence, and Action.
    """
    from plant_knowledge import lookup_plant_knowledge

    pk = lookup_plant_knowledge(plant_name)
    target_min = pk["soil_moisture_target_min"]
    target_max = pk["soil_moisture_target_max"]
    crit_low = pk["critical_low_moisture"]
    heat_sensitive = pk["heat_sensitive"]

    # Analyze drying rate from recent sensor history if provided
    drying_delta = 0.0
    history_hours = 0.0
    if recent_history and len(recent_history) >= 2:
        try:
            m_first = float(recent_history[0].get("moisture", recent_history[0].get("value", 0)))
            m_last = float(recent_history[-1].get("moisture", recent_history[-1].get("value", 0)))
            drying_delta = round(m_first - m_last, 1)
            history_hours = len(recent_history) * 0.5  # approx
        except Exception:
            pass

    evidence = {
        "soil_moisture": f"{soil_moisture_percent:.1f}%",
        "temperature": f"{temperature_c:.1f}°C",
        "humidity": f"{humidity_percent:.1f}%",
        "water_level": f"{water_level_percent:.1f}%",
        "target_range": f"{target_min}% - {target_max}%",
        "last_watering": f"{int(hours_since_last_watering)} hours ago" if hours_since_last_watering is not None else "Unknown",
        "drying_drop": f"{drying_delta}% drop observed" if drying_delta > 0 else "Moisture stable",
    }

    # Reservoir safety cutoff
    if water_level_percent <= 15.0:
        return {
            "recommendation": "DO_NOT_WATER",
            "why": f"Water tank level is critically low ({water_level_percent:.1f}%). Pump activation is locked to prevent motor damage.",
            "evidence": evidence,
            "confidence": 98.0,
            "action": "Refill the water reservoir immediately before initiating any irrigation.",
            "plant_info": pk,
            "source": "iot_safety_rule",
        }

    # Rain Guard: postpone if rainfall forecasted or recent
    if recent_rainfall:
        return {
            "recommendation": "WAIT",
            "why": f"🌧️ Rain Guard Active: Rain is forecasted or recently occurred. Natural precipitation will hydrate the soil for {pk['canonical_name']}.",
            "evidence": evidence,
            "confidence": 95.0,
            "action": "Postpone watering. Re-check soil moisture after rainfall has settled.",
            "plant_info": pk,
            "source": "rain_guard_rule",
        }

    # Excessive moisture
    if soil_moisture_percent >= target_max:
        return {
            "recommendation": "DO_NOT_WATER",
            "why": f"Soil moisture ({soil_moisture_percent:.1f}%) is at or above optimal capacity ({target_max}%) for {pk['canonical_name']}. Additional water will cause root hypoxia.",
            "evidence": evidence,
            "confidence": 94.0,
            "action": "Allow soil to naturally transpire and aerate. Inspect drainage holes.",
            "plant_info": pk,
            "source": "deterministic_iot",
        }

    # Severe stress condition
    if soil_moisture_percent <= crit_low:
        why = f"Soil moisture has dropped to {soil_moisture_percent:.1f}%, which is below the critical wilt threshold ({crit_low}%) for {pk['canonical_name']}."
        if drying_delta > 10:
            why += f" Moisture dropped {drying_delta} percentage points rapidly."
        return {
            "recommendation": "WATER_NOW",
            "why": why,
            "evidence": evidence,
            "confidence": 92.0,
            "action": f"Apply deep watering at the root zone (approx {pk['water_depth']}). Avoid splashing foliage.",
            "plant_info": pk,
            "source": "deterministic_iot",
        }

    # Approaching lower boundary
    if soil_moisture_percent < target_min:
        is_hot = temperature_c >= 33.0
        if is_hot and heat_sensitive:
            return {
                "recommendation": "WATER_NOW",
                "why": f"Soil moisture ({soil_moisture_percent:.1f}%) is below preferred {target_min}% and high ambient temperature ({temperature_c:.1f}°C) will accelerate leaf wilting.",
                "evidence": evidence,
                "confidence": 86.0,
                "action": "Water gently at the base in early morning or evening. Consider adding organic mulch.",
                "plant_info": pk,
                "source": "deterministic_iot",
            }
        else:
            return {
                "recommendation": "CHECK_SOIL",
                "why": f"Soil moisture ({soil_moisture_percent:.1f}%) is near minimum {target_min}%. Surface may be dry while root zone retains adequate moisture.",
                "evidence": evidence,
                "confidence": 80.0,
                "action": "Check soil 3–5 cm below surface. If crumbly and dry, irrigate; otherwise wait.",
                "plant_info": pk,
                "source": "deterministic_iot",
            }

    # Moisture is in optimal target range
    return {
        "recommendation": "WAIT",
        "why": f"Soil moisture ({soil_moisture_percent:.1f}%) is within the healthy zone ({target_min}%–{target_max}%) for {pk['canonical_name']}.",
        "evidence": evidence,
        "confidence": 88.0,
        "action": "No immediate watering needed. Re-evaluate tomorrow morning.",
        "plant_info": pk,
        "source": "deterministic_iot",
    }

