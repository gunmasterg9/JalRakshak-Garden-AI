import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Droplets,
  Thermometer,
  Sun,
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  TrendingDown,
  Gauge,
  Compass,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  Flame,
  ShieldCheck,
  RefreshCw,
  Plus,
  BookOpen,
} from 'lucide-react';
import {
  fetchDigitalTwins,
  fetchGardenZones,
  fetchMicroclimateMap,
  fetchWaterBudget,
  updateWaterBudget,
  fetchDryingCurvesV2,
  fetchPredictiveWatering,
  fetchAdaptiveDuration,
  fetchGardenMemory,
  recordGardenMemory,
} from '../api';
import {
  PlantDigitalTwin,
  GardenZone,
  MicroclimateMap,
  WaterBudget,
  DryingCurvesV2,
  PredictiveWatering,
  AdaptiveDuration,
  GardenMemoryEvent,
} from '../types';
import { useGarden } from '../context/GardenContext';

export const DigitalTwin: React.FC = () => {
  const { t } = useGarden();
  const [twins, setTwins] = useState<PlantDigitalTwin[]>([]);
  const [zones, setZones] = useState<GardenZone[]>([]);
  const [climate, setClimate] = useState<MicroclimateMap | null>(null);
  const [budget, setBudget] = useState<WaterBudget | null>(null);
  const [curves, setCurves] = useState<DryingCurvesV2 | null>(null);
  const [predictive, setPredictive] = useState<PredictiveWatering | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveDuration | null>(null);
  const [memoryEvents, setMemoryEvents] = useState<GardenMemoryEvent[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string>('Tomato');
  const [loading, setLoading] = useState(true);
  const [budgetEdit, setBudgetEdit] = useState<number>(80);
  const [editingBudget, setEditingBudget] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [twData, zData, climData, bData, cData, pData, aData, memData] = await Promise.all([
        fetchDigitalTwins().catch(() => []),
        fetchGardenZones().catch(() => []),
        fetchMicroclimateMap().catch(() => null),
        fetchWaterBudget().catch(() => null),
        fetchDryingCurvesV2('esp32-garden-01', 7).catch(() => null),
        fetchPredictiveWatering('esp32-garden-01', selectedPlant).catch(() => null),
        fetchAdaptiveDuration('esp32-garden-01', selectedPlant).catch(() => null),
        fetchGardenMemory(72, 20).catch(() => []),
      ]);
      setTwins(twData);
      setZones(zData);
      setClimate(climData);
      setBudget(bData);
      if (bData) setBudgetEdit(bData.target_liters);
      setCurves(cData);
      setPredictive(pData);
      setAdaptive(aData);
      setMemoryEvents(memData);
    } catch (err) {
      console.error('Error loading Digital Twin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [selectedPlant]);

  const handleUpdateBudget = async () => {
    try {
      await updateWaterBudget(budgetEdit);
      const updated = await fetchWaterBudget();
      setBudget(updated);
      setEditingBudget(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddObservation = async () => {
    const note = prompt('Enter physical observation note for Garden Memory (e.g., pruned lower leaves, added mulch):');
    if (!note) return;
    try {
      await recordGardenMemory({
        event_type: 'plant_observation',
        source: 'USER',
        plant_id: selectedPlant,
        zone_id: 'zone-1',
        data: { note, timestamp: new Date().toISOString() },
      });
      const updatedMem = await fetchGardenMemory(72, 20);
      setMemoryEvents(updatedMem);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sage">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-nature-700" />
            <h1 className="text-2xl font-heading font-extrabold text-stone-900 tracking-tight">
              Garden Digital Twin & Predictive Intelligence
            </h1>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Real-time virtual replicas, multi-node microclimate divergence, and adaptive irrigation learning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddObservation}
            className="btn-secondary text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Observation
          </button>
          <button
            onClick={loadAll}
            disabled={loading}
            className="btn-primary text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Twin
          </button>
        </div>
      </div>

      {/* Water Conservation Budget Hero Bar */}
      {budget && (
        <div className="garden-card p-5 border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-50/50 via-white to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Weekly Water Budget Tracker
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    budget.status === 'NORMAL'
                      ? 'bg-emerald-100 text-emerald-800'
                      : budget.status === 'WATCH'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800 animate-pulse'
                  }`}
                >
                  {budget.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-stone-900 font-heading flex items-baseline gap-2">
                <span>{budget.consumed_liters} L</span>
                <span className="text-sm font-medium text-stone-500">
                  used of {budget.target_liters} L limit ({budget.remaining_liters} L remaining)
                </span>
              </div>
              <p className="text-xs text-stone-600">{budget.advisory}</p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="w-full sm:w-48 bg-stone-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budget.percent_consumed >= 100
                      ? 'bg-rose-500'
                      : budget.percent_consumed >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, budget.percent_consumed)}%` }}
                />
              </div>
              {editingBudget ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={budgetEdit}
                    onChange={(e) => setBudgetEdit(Number(e.target.value))}
                    className="w-20 px-2 py-1 border rounded text-xs"
                    min={10}
                    max={500}
                  />
                  <button
                    onClick={handleUpdateBudget}
                    className="px-2 py-1 bg-nature-700 text-white rounded text-xs font-bold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingBudget(false)}
                    className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingBudget(true)}
                  className="text-xs text-sky-700 font-semibold hover:underline"
                >
                  Edit Target ({budget.target_liters}L) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Node Microclimate Map */}
      {climate && (
        <div className="garden-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sage">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              <h2 className="font-heading font-extrabold text-stone-900 text-base">
                Terrace & Garden Microclimate Map (Multi-ESP32)
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Δ {climate.temperature_divergence_c}°C variance
              </span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-600">{climate.node_count} Physical Nodes</span>
            </div>
          </div>

          <p className="text-xs text-stone-600 italic">{climate.divergence_summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {climate.nodes.map((node) => (
              <div
                key={node.device_id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-900">{node.zone_name}</span>
                  <span className="text-[10px] font-mono text-stone-400">{node.device_id}</span>
                </div>
                <div className="text-[11px] font-medium text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded inline-block">
                  {node.exposure}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Temperature</span>
                    <span className="font-extrabold text-stone-900 text-sm">{node.temperature_c} °C</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Humidity</span>
                    <span className="font-extrabold text-stone-900 text-sm">{node.humidity_percent} %</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Soil Moisture</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{node.soil_moisture_percent} %</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Drying Rate</span>
                    <span className="font-extrabold text-stone-900 text-sm">{node.drying_rate_percent_per_hour} %/h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictive Watering & Adaptive Duration Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predictive Watering Card */}
        <div className="garden-card p-5 space-y-3 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between pb-2 border-b border-sage">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-nature-700" />
              <h3 className="font-heading font-extrabold text-stone-900 text-sm">
                Predictive Critical Soil Forecast
              </h3>
            </div>
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="text-xs font-semibold px-2 py-1 border border-stone-200 rounded-lg bg-white"
            >
              {twins.map((t) => (
                <option key={t.plant_id} value={t.species}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {predictive && predictive.status !== 'insufficient_data' ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-stone-500 block uppercase font-bold">
                    Hours Until Critical Wilt Threshold
                  </span>
                  <div className="text-2xl font-extrabold text-stone-900 font-heading">
                    {predictive.hours_until_critical !== null ? (
                      predictive.hours_until_critical <= 0 ? (
                        <span className="text-rose-600 animate-pulse">Critical Now</span>
                      ) : (
                        `~ ${predictive.hours_until_critical} hours`
                      )
                    ) : (
                      'Calculating...'
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Confidence: {predictive.prediction_confidence}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Optimal Watering Window:</span>
                  <span className="font-bold text-stone-900">{predictive.recommended_watering_window}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Current vs Critical:</span>
                  <span className="font-mono font-bold">
                    {predictive.current_moisture}% → {predictive.critical_threshold}%
                  </span>
                </div>
                {predictive.predicted_moisture_in_4h !== undefined && (
                  <div className="flex justify-between text-stone-500 text-[11px]">
                    <span>Projected in 4 hours:</span>
                    <span>{predictive.predicted_moisture_in_4h}% moisture</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-stone-500">
              Collecting continuous sensor telemetry to calculate predictive wilt curve...
            </div>
          )}
        </div>

        {/* Adaptive Duration & Learned Absorption */}
        <div className="garden-card p-5 space-y-3 border-sky-200 bg-gradient-to-br from-white to-sky-50/30">
          <div className="flex items-center justify-between pb-2 border-b border-sage">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-600" />
              <h3 className="font-heading font-extrabold text-stone-900 text-sm">
                Adaptive Duration Learning Engine
              </h3>
            </div>
            <span className="text-[11px] font-mono text-stone-500">
              Safety Cap: {adaptive?.hardware_max_safety_limit || 60}s
            </span>
          </div>

          {adaptive ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-stone-500 block uppercase font-bold">
                    Learned Runtime Recommendation
                  </span>
                  <div className="text-2xl font-extrabold text-sky-900 font-heading">
                    {adaptive.recommended_duration_seconds} seconds{' '}
                    <span className="text-xs font-normal text-stone-500">
                      (~{adaptive.estimated_liters_delivered} L)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                  {adaptive.confidence.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Learned Absorption Rate:</span>
                  <span className="font-mono font-bold text-stone-900">
                    +{adaptive.learned_recovery_percent_per_second}% per sec
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Target Sweet Spot:</span>
                  <span className="font-bold text-emerald-700">{adaptive.target_sweet_spot}% moisture</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Historical Cycles Evaluated:</span>
                  <span>{adaptive.historical_events_analyzed} events</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-stone-500">
              Analyzing historical pump-to-moisture absorption curves...
            </div>
          )}
        </div>
      </div>

      {/* Condition-Segmented Drying Curves (Drying Curve Engine 2.0) */}
      {curves && (
        <div className="garden-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sage">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-nature-700" />
              <h2 className="font-heading font-extrabold text-stone-900 text-base">
                Drying Curve Engine 2.0 — Condition-Segmented Evaporation Rates
              </h2>
            </div>
            <span className="text-xs text-stone-500">
              Peak: <span className="font-bold text-stone-800">{curves.primary_peak_drying_window}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <span className="text-[11px] font-bold text-amber-900 uppercase block">Morning</span>
              <span className="text-lg font-extrabold text-stone-900 mt-1 block">
                {curves.condition_rates.morning_drying_rate} %/h
              </span>
              <span className="text-[10px] text-stone-500">06:00 - 12:00</span>
            </div>

            <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200">
              <span className="text-[11px] font-bold text-orange-900 uppercase block">Afternoon</span>
              <span className="text-lg font-extrabold text-stone-900 mt-1 block">
                {curves.condition_rates.afternoon_drying_rate} %/h
              </span>
              <span className="text-[10px] text-stone-500">12:00 - 18:00</span>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
              <span className="text-[11px] font-bold text-indigo-900 uppercase block">Night</span>
              <span className="text-lg font-extrabold text-stone-900 mt-1 block">
                {curves.condition_rates.night_drying_rate} %/h
              </span>
              <span className="text-[10px] text-stone-500">18:00 - 06:00</span>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
              <span className="text-[11px] font-bold text-rose-900 uppercase block">Hot Day (≥35°C)</span>
              <span className="text-lg font-extrabold text-stone-900 mt-1 block">
                {curves.condition_rates.hot_day_drying_rate} %/h
              </span>
              <span className="text-[10px] text-stone-500">Solar stress</span>
            </div>

            <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200">
              <span className="text-[11px] font-bold text-sky-900 uppercase block">Humid (≥60%)</span>
              <span className="text-lg font-extrabold text-stone-900 mt-1 block">
                {curves.condition_rates.humid_day_drying_rate} %/h
              </span>
              <span className="text-[10px] text-stone-500">Low vapor deficit</span>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <span className="text-[11px] font-bold text-blue-900 uppercase block">Rain / Settled</span>
              <span className="text-lg font-extrabold text-stone-900 mt-1 block">
                {curves.condition_rates.rainy_day_drying_rate} %/h
              </span>
              <span className="text-[10px] text-stone-500">Rain Guard</span>
            </div>
          </div>
        </div>
      )}

      {/* Plant Digital Twins Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-nature-700" />
            <h2 className="font-heading font-extrabold text-stone-900 text-base">
              Active Plant Digital Twins ({twins.length})
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-mono">Live virtual state models</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {twins.map((twin) => (
            <div
              key={twin.plant_id}
              className="garden-card p-5 space-y-3 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-extrabold text-stone-900 text-base">{twin.name}</h3>
                  <span className="text-xs text-stone-500 font-mono">
                    {twin.plant_id} · Zone: {twin.zone_id}
                  </span>
                </div>
                {/* Health score circle */}
                <div
                  className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-heading font-extrabold text-xs shadow-xs ${
                    twin.health_score >= 80
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : twin.health_score >= 60
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                  title="Comprehensive Plant Health Score (0–100)"
                >
                  <span className="text-xs leading-none">{twin.health_score}</span>
                  <span className="text-[8px] text-stone-500 uppercase">Health</span>
                </div>
              </div>

              {/* Stress Badges */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    twin.water_stress === 'low'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : twin.water_stress === 'moderate'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  Water: {twin.water_stress}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    twin.heat_stress === 'low'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}
                >
                  Heat: {twin.heat_stress}
                </span>
                <span className="px-2 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-600">
                  {twin.soil_type}
                </span>
              </div>

              {/* Moisture gauge progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Current Soil Moisture</span>
                  <span className="font-extrabold text-stone-900">{twin.current_moisture}%</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      twin.current_moisture < twin.target_moisture_min
                        ? 'bg-amber-500'
                        : twin.current_moisture > twin.target_moisture_max
                        ? 'bg-sky-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, twin.current_moisture)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                  <span>Target: {twin.target_moisture_min}%</span>
                  <span>Max: {twin.target_moisture_max}%</span>
                </div>
              </div>

              {/* Bottom twin metrics */}
              <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                <div>
                  <span className="text-stone-400 block">Drying Rate</span>
                  <span className="font-bold text-stone-800">{twin.drying_rate} %/h</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Total Water Used</span>
                  <span className="font-bold text-sky-800">{twin.total_water_used_liters} L</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 line-clamp-2 italic pt-1">{twin.care_notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Persistent Garden Memory Stream */}
      <div className="garden-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-sage">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-700" />
            <h2 className="font-heading font-extrabold text-stone-900 text-base">
              Persistent Garden Memory Timeline (Last 72 Hours)
            </h2>
          </div>
          <span className="text-xs text-stone-500">{memoryEvents.length} Recorded Events</span>
        </div>

        {memoryEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500">
            No garden memory events recorded yet. Add observations or trigger irrigation.
          </div>
        ) : (
          <div className="divide-y divide-sage max-h-80 overflow-y-auto pr-2 space-y-1">
            {memoryEvents.map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.source === 'USER'
                          ? 'bg-amber-100 text-amber-800'
                          : evt.source === 'AI'
                          ? 'bg-purple-100 text-purple-800'
                          : evt.source === 'SENSOR'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {evt.source}
                    </span>
                    <span className="font-bold text-stone-900 capitalize">
                      {evt.event_type.replace('_', ' ')}
                    </span>
                    {evt.plant_id && (
                      <span className="text-stone-500 font-mono text-[11px]">· {evt.plant_id}</span>
                    )}
                  </div>
                  <p className="text-stone-600 text-[11px]">
                    {evt.data?.summary || evt.data?.note || evt.data?.reason || JSON.stringify(evt.data)}
                  </p>
                </div>
                <span className="text-[10px] text-stone-400 font-mono whitespace-nowrap">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
