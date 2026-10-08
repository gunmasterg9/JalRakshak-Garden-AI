# Touch Grass 🌱 Why Open Innovation Matters for JalRakshak Garden AI

## Hackathon Theme: Touch Grass
> *"Build something with open-weight models or open-source AI that gets people off the screen and into the world. The best builds here should make the screen the shortest part of the experience."*

In modern life, people spend an average of 7+ hours looking at screens. Gardening is one of the most grounding, therapeutic, and ecologically beneficial outdoor activities available, yet gardening apps often trap users behind endless notifications, gamified ads, and cloud paywalls.

**JalRakshak Garden AI** inverts this relationship:
1. **The screen is the shortest part:** You check your garden status for 60 seconds, get an actionable watering check, and get prompted with an outdoor mission.
2. **Outdoor Missions ("Touch Grass" Challenges):** Encourages daily screen-free outdoor habits — inspect leaf undersides for beneficial insects, feel soil moisture with your fingers, add mulch, observe pollinators, or collect rainwater.
3. **No guilt or dark patterns:** Zero manipulative notifications or streak penalties.

---

## Why Open Innovation Matters

### 1. Runs on a Laptop with No Internet (Zero Connectivity Required)
Gardening happens outdoors — in backyards, balconies, terrace gardens, and rural plots where Wi-Fi is weak or mobile data is nonexistent. Because JalRakshak runs open-weight models via **Ollama** (`gemma4:12b`, `gemma3:4b`, `qwen3:8b`, `llama3.2`) coupled with a deterministic rules engine, the entire application operates seamlessly offline.

### 2. Keeps Private Data Off Servers You Don't Control
Plant photos taken in personal living spaces, geotagged terrace gardens, and personal notes remain on your own disk in local SQLite. There is zero telemetry, zero cloud tracking, and zero surveillance.

### 3. Model Swapping and Custom Adaptation
Open innovation allows gardeners and researchers to swap models according to their hardware:
- A high-end machine can run `gemma4:12b` for detailed reasoning.
- A lightweight laptop can run `gemma3:4b` or `llama3.2:latest`.
- Multilingual and non-Latin script users can switch to `qwen3:8b`.
- Agronomists can substitute fine-tuned agricultural models trained on specific local crops (e.g. Gujarat semi-arid agriculture).

### 4. Zero Recurring Costs
Cloud AI APIs charge per token and per image. For smallholder farmers and hobby gardeners, pay-per-query models create a barrier to entry. Open-weight inference costs $0.00 to run.

### 5. Transparent Fallback vs. Closed-Box Hallucinations
When advising on living plants, caution is paramount. Closed cloud APIs often hallucinate precise water volumes (e.g., *"give exactly 1.74 liters"*) or recommend toxic pesticides. JalRakshak's open architecture enforces safe non-chemical defaults and transparently falls back to deterministic agronomic rules if the AI is offline or uncertain.
