import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Sun,
  CloudRain,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Waves,
  RefreshCw,
  Sprout,
  AlertCircle,
} from 'lucide-react';
import { fetchPlants, fetchWaterPlan, logWatering } from '../api';
import { Plant, WaterPlan } from '../types';
import { useGarden } from '../context/GardenContext';

export const WaterPlanner: React.FC = () => {
  const { t, isGujaratMode } = useGarden();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');

  const [form, setForm] = useState({
    plant: 'Tomato (ટામેટું)',
    location: 'Gujarat, India',
    soil: 'loamy',
    moisture: 'slightly dry',
    weather: 'hot and sunny',
    garden_size: 'small',
    water_source: 'tap / stored water',
    sunlight: 'full sun',
    container_type: 'pot',
    recent_rainfall: 'None',
    temperature: '36°C',
    use_ai: true,
  });

  const [plan, setPlan] = useState<WaterPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    fetchPlants().then((data) => setPlants(data)).catch((e) => console.error(e));
  }, []);

  const handleSelectPlant = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPlantId(val);
    if (val) {
      const p = plants.find((x) => x.id === Number(val));
      if (p) {
        setForm((prev) => ({
          ...prev,
          plant: p.name,
          soil: p.soil_type || 'loamy',
          container_type: p.container_type || 'pot',
          sunlight: p.sunlight || 'full sun',
        }));
      }
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLogged(false);
    try {
      const result = await fetchWaterPlan(form);
      setPlan(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogNow = async () => {
    if (!selectedPlantId) {
      alert('Please select an existing plant from your garden to record this log.');
      return;
    }
    try {
      await logWatering(Number(selectedPlantId), 250, 'Recommended soak', plan?.summary || '');
      setLogged(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-water-100 text-water-600 flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-stone-900">
            {t.waterPlanner}
          </h1>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Precision, evaporation-conscious water recommendations. Avoid overwatering and protect root systems.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Inputs */}
        <form onSubmit={handleGeneratePlan} className="garden-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sage">
            <h2 className="text-base font-bold font-heading text-stone-900">
              Garden & Climate Inputs
            </h2>
            {isGujaratMode && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Gujarat Arid Mode
              </span>
            )}
          </div>

          {/* Plant selection */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Plant / Crop
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedPlantId}
                onChange={handleSelectPlant}
                className="px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="">-- Choose My Plant --</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={form.plant}
                onChange={(e) => setForm({ ...form, plant: e.target.value })}
                className="px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              />
            </div>
          </div>

          {/* Soil & Current Moisture */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Soil Type
              </label>
              <select
                value={form.soil}
                onChange={(e) => setForm({ ...form, soil: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="loamy">Loamy (Balanced)</option>
                <option value="sandy">Sandy (Fast drainage)</option>
                <option value="clay">Clay (Holds moisture)</option>
                <option value="potting mix">Potting Mix</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Current Soil Moisture *
              </label>
              <select
                value={form.moisture}
                onChange={(e) => setForm({ ...form, moisture: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50 font-bold text-stone-800"
              >
                <option value="very dry">Very Dry (Cracking/loose)</option>
                <option value="slightly dry">Slightly Dry (Top 2 cm)</option>
                <option value="moist">Moist (Cool to touch)</option>
                <option value="wet">Wet / Waterlogged</option>
              </select>
            </div>
          </div>

          {/* Weather & Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Today's Weather
              </label>
              <select
                value={form.weather}
                onChange={(e) => setForm({ ...form, weather: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="hot and sunny">Hot and Sunny</option>
                <option value="warm and breezy">Warm and Breezy</option>
                <option value="mild / cloudy">Mild / Cloudy</option>
                <option value="rainy / humid">Rainy / Monsoon Humid</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Temperature (°C)
              </label>
              <input
                type="text"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                placeholder="e.g. 38°C"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              />
            </div>
          </div>

          {/* Container & Rainfall */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Container Type
              </label>
              <select
                value={form.container_type}
                onChange={(e) => setForm({ ...form, container_type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="pot">Potted container (dries fast)</option>
                <option value="ground">In-ground garden bed</option>
                <option value="balcony pots">Balcony railing pots</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Recent Rainfall
              </label>
              <select
                value={form.recent_rainfall}
                onChange={(e) => setForm({ ...form, recent_rainfall: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="None">None in last 3 days</option>
                <option value="Light shower">Light shower yesterday</option>
                <option value="Heavy rain">Heavy rain in last 24h</option>
              </select>
            </div>
          </div>

          {/* AI Toggle */}
          <div className="pt-2 flex items-center justify-between border-t border-sage">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-stone-800">
                Use Local Open-Weight AI
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.use_ai}
                onChange={(e) => setForm({ ...form, use_ai: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-nature-600"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-xs font-bold py-3 justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Water Plan...</span>
              </>
            ) : (
              <>
                <Droplets className="w-4 h-4" />
                <span>Generate Smart Water Plan</span>
              </>
            )}
          </button>
        </form>

        {/* Results Card */}
        <div className="space-y-4">
          {!plan ? (
            <div className="garden-card p-12 text-center flex flex-col items-center justify-center h-full min-h-[380px] text-stone-400">
              <Droplets className="w-12 h-12 stroke-[1.5] mb-3 text-water-300" />
              <h3 className="text-sm font-bold text-stone-700 font-heading">
                Smart Water Advice Awaiting
              </h3>
              <p className="text-xs text-stone-400 max-w-xs mt-1">
                Configure your plant conditions on the left. JalRakshak will evaluate soil moisture,
                sunlight, and evaporation risk.
              </p>
            </div>
          ) : (
            <div className="garden-card p-6 space-y-4 border-nature-300">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-sage">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-nature-100 text-nature-800 px-2 py-0.5 rounded-full">
                      {plan.source || 'Offline Rules'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        plan.water_today === 'yes'
                          ? 'bg-water-100 text-water-800'
                          : plan.water_today === 'no'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-nature-800'
                      }`}
                    >
                      {plan.water_today === 'yes'
                        ? 'Water Today'
                        : plan.water_today === 'no'
                        ? 'Postpone Watering'
                        : 'Check Soil First'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-heading text-stone-900 mt-1">
                    {plan.title}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 font-semibold block">
                    Best Time
                  </span>
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-nature-600" />
                    <span>{plan.suggested_time || plan.timing}</span>
                  </span>
                </div>
              </div>

              {/* Highlight summary */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-nature-700 block">
                  Action Recommendation
                </span>
                <p className="text-xs font-semibold text-nature-950 leading-relaxed">
                  {plan.summary}
                </p>
              </div>

              {/* Water amount guideline */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-cream-50 p-3 rounded-xl border border-sage">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                    Irrigation Guideline
                  </span>
                  <p className="text-stone-800 font-medium">{plan.amount}</p>
                </div>
                <div className="bg-cream-50 p-3 rounded-xl border border-sage">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                    Timing & Atmosphere
                  </span>
                  <p className="text-stone-800 font-medium">{plan.timing}</p>
                </div>
              </div>

              {/* Practical Checklist */}
              <div>
                <span className="text-xs font-bold text-stone-800 block mb-2 font-heading">
                  Water-Saving Checklist & Evaporation Controls:
                </span>
                <ul className="space-y-1.5">
                  {plan.checklist?.map((item, idx) => (
                    <li key={idx} className="text-xs text-stone-700 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-nature-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Watch For */}
              <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{plan.watch_for}</p>
              </div>

              {/* One-click watering record */}
              <div className="pt-3 border-t border-sage flex items-center justify-between">
                <span className="text-[11px] text-stone-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-nature-600" /> Transparent Local Engine
                </span>

                {logged ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Water Logged!
                  </span>
                ) : (
                  <button
                    onClick={handleLogNow}
                    disabled={!selectedPlantId}
                    className="btn-primary text-xs py-1.5 px-3"
                    title={!selectedPlantId ? 'Select an existing plant from your garden above' : ''}
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Log to Plant History</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
