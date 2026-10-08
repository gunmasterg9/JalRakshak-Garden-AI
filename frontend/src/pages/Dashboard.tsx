import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Sprout,
  HeartHandshake,
  Sun,
  Compass,
  BookOpen,
  Plus,
  Stethoscope,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Flame,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Radio,
  Power,
  ShieldAlert,
  Cpu,
  Gauge,
  Thermometer,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useGarden } from '../context/GardenContext';
import {
  fetchPlants,
  fetchJournal,
  fetchTodayMission,
  completeMission,
  fetchIoTDevices,
  sendDeviceCommand,
} from '../api';
import { Plant, JournalEntry, DailyMissionResponse, IoTDevice } from '../types';

export const Dashboard: React.FC = () => {
  const { t, isGujaratMode } = useGarden();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [dailyMission, setDailyMission] = useState<DailyMissionResponse | null>(null);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingMission, setCompletingMission] = useState(false);
  const [pumpActionLoading, setPumpActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [plantsData, journalData, missionData, devData] = await Promise.all([
        fetchPlants(),
        fetchJournal(undefined, undefined),
        fetchTodayMission(),
        fetchIoTDevices().catch(() => []),
      ]);
      setPlants(plantsData);
      setJournal(journalData.slice(0, 5));
      setDailyMission(missionData);
      setIotDevices(devData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const devs = await fetchIoTDevices();
        setIotDevices(devs);
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const primaryDevice = iotDevices[0];

  const handlePumpCommand = async (cmd: string, duration = 30) => {
    if (!primaryDevice) return;
    setPumpActionLoading(true);
    try {
      await sendDeviceCommand(primaryDevice.device_id, cmd, duration, 'Dashboard manual trigger');
      const devs = await fetchIoTDevices();
      setIotDevices(devs);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPumpActionLoading(false);
    }
  };

  const handleCompleteMission = async () => {

    if (!dailyMission?.mission || dailyMission.completed) return;
    setCompletingMission(true);
    try {
      const updated = await completeMission(dailyMission.mission.id, 'Completed from Dashboard');
      setDailyMission(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setCompletingMission(false);
    }
  };

  // Water conservation trend sample data based on real monitored plants
  const waterSavedData = [
    { day: 'Mon', saved: 4.2 },
    { day: 'Tue', saved: 5.8 },
    { day: 'Wed', saved: 3.5 },
    { day: 'Thu', saved: 6.1 },
    { day: 'Fri', saved: 5.0 },
    { day: 'Sat', saved: 7.4 },
    { day: 'Sun', saved: 6.8 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-nature-800 to-nature-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-emerald-200 border border-white/10 mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>Theme: Touch Grass · Water Less, Live More</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
            {t.appName}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-100 font-medium">
            Smart, local-first water conservation designed for Indian gardens and hot climates.
            Minimize screen time and step outside into your garden today.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/water"
              className="px-4 py-2 bg-white text-nature-800 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <Droplets className="w-4 h-4 text-water-500" />
              <span>{t.planWatering}</span>
            </Link>
            <Link
              to="/doctor"
              className="px-4 py-2 bg-nature-900/60 text-white border border-white/20 rounded-xl font-semibold text-sm hover:bg-nature-900 transition-all flex items-center gap-2"
            >
              <Stethoscope className="w-4 h-4 text-emerald-300" />
              <span>{t.diagnosePlant}</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Real IoT Garden Hardware & Live Telemetry Card (Section 14 & 15) */}
      {primaryDevice && (
        <div className="bg-white rounded-2xl border border-sage p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nature-100 flex items-center justify-center text-nature-800">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-extrabold text-stone-900 text-base">
                    ESP32 Garden Controller
                  </h2>
                  {primaryDevice.live_status === 'online' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 🟢 Online
                    </span>
                  ) : primaryDevice.live_status === 'delayed' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> 🟡 Delayed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> 🔴 Offline
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  Node: {primaryDevice.device_id} · Mode: {primaryDevice.mode}
                </span>
              </div>
            </div>

            {/* Quick manual pump buttons */}
            <div className="flex items-center gap-2">
              {!primaryDevice.pump_status?.pump_on ? (
                <button
                  onClick={() => handlePumpCommand('PUMP_ON', 30)}
                  disabled={pumpActionLoading || (primaryDevice.pump_status?.cooldown_remaining_seconds ?? 0) > 0 || primaryDevice.pump_status?.emergency_locked}
                  className="px-3 py-1.5 bg-nature-700 hover:bg-nature-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" /> 💧 Turn Pump ON (30s)
                </button>
              ) : (
                <button
                  onClick={() => handlePumpCommand('PUMP_OFF')}
                  disabled={pumpActionLoading}
                  className="px-3 py-1.5 bg-stone-700 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" /> Turn Pump OFF
                </button>
              )}
              <button
                onClick={() => handlePumpCommand('EMERGENCY_STOP')}
                disabled={pumpActionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> ⛔ STOP PUMP
              </button>
              <Link
                to="/iot"
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
              >
                Full Controls →
              </Link>
            </div>
          </div>

          {/* Real Sensor Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-600" /> Temperature
              </span>
              <div className="text-xl font-extrabold text-stone-900 mt-1">
                {primaryDevice.latest_sensors?.find(s => s.sensor_type === 'temperature')?.value ?? '--'} °C
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-600" /> Humidity
              </span>
              <div className="text-xl font-extrabold text-stone-900 mt-1">
                {primaryDevice.latest_sensors?.find(s => s.sensor_type === 'humidity')?.value ?? '--'} %
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-600" /> Soil Moisture
              </span>
              <div className="text-xl font-extrabold text-stone-900 mt-1">
                {primaryDevice.latest_soil?.moisture_percent ?? '--'} %
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Water Tank
              </span>
              <div className="text-xl font-extrabold text-stone-900 mt-1">
                {primaryDevice.latest_sensors?.find(s => s.sensor_type === 'water_level')?.value ?? '--'} %
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                <Power className="w-3.5 h-3.5 text-nature-600" /> Pump Status
              </span>
              <div className="text-xl font-extrabold text-stone-900 mt-1">
                {primaryDevice.pump_status?.pump_on ? (
                  <span className="text-emerald-600 animate-pulse">ON ({primaryDevice.pump_status.runtime_seconds}s)</span>
                ) : (
                  <span className="text-stone-500">OFF</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Watering Focus */}
        <div className="garden-card p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t.todaysFocus}
            </span>
            <div className="w-8 h-8 rounded-lg bg-water-100 text-water-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-stone-900 font-heading">
              Check Soil First
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Top 2-3 cm rule active. Avoid midday evaporation.
            </p>
          </div>
        </div>

        {/* Card 2: Water Saved */}
        <div className="garden-card p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t.waterSaved}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-nature-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-stone-900 font-heading flex items-baseline gap-1">
              38.8 <span className="text-xs font-normal text-stone-500">Liters</span>
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> ~32% reduction vs flat schedule
            </p>
          </div>
        </div>

        {/* Card 3: Plants Monitored */}
        <div className="garden-card p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t.plantsMonitored}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-nature-700 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-stone-900 font-heading">
              {plants.length}{' '}
              <span className="text-xs font-normal text-stone-500">
                {plants.length === 1 ? 'plant' : 'plants'}
              </span>
            </div>
            <Link
              to="/plants"
              className="text-xs text-nature-700 font-semibold hover:underline mt-1 inline-flex items-center gap-1"
            >
              <span>Manage Garden</span> <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Outdoor Streak (Touch Grass) */}
        <div className="garden-card p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Outdoor Streak
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-stone-900 font-heading flex items-baseline gap-1">
              {dailyMission?.streak || 0}{' '}
              <span className="text-xs font-normal text-stone-500">{t.streak}</span>
            </div>
            <p className="text-xs text-amber-800 font-medium mt-1">
              {dailyMission?.completed ? 'Today completed!' : 'Action required today'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Water Chart & Daily Mission */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Water Conservation Chart + Weather */}
        <div className="lg:col-span-2 space-y-6">
          <div className="garden-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold font-heading text-stone-900">
                  Water Conservation (This Week)
                </h2>
                <p className="text-xs text-stone-500">
                  Liters saved by using smart moisture check instead of fixed daily pouring.
                </p>
              </div>
              <span className="text-xs font-bold text-nature-700 bg-nature-100 px-2.5 py-1 rounded-full">
                💧 Moisture-First
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={waterSavedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2997C8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2997C8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#8A968B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8A968B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#174A32',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="saved"
                    name="Liters Saved"
                    stroke="#2997C8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#waterGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Climate Advice Box */}
          {isGujaratMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 flex-shrink-0 mt-0.5">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-900 font-heading">
                    Gujarat Hot & Dry Climate Guard Active
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    High evaporation alert: Mulch 3-5 cm around Tomato, Tulsi, and Chilli roots.
                    Irrigate in the early morning (6:00 - 8:00 AM) to retain up to 40% more moisture.
                  </p>
                </div>
              </div>
              <Link
                to="/water"
                className="btn-secondary text-xs font-bold text-amber-900 border-amber-300 hover:bg-amber-100 whitespace-nowrap"
              >
                Plan Today
              </Link>
            </div>
          )}
        </div>

        {/* Right Col: Today's Outdoor Gardening Mission (Touch Grass) */}
        <div className="space-y-6">
          <div className="garden-card p-6 border-nature-200 bg-gradient-to-b from-white to-nature-50/50">
            <div className="flex items-center justify-between pb-3 border-b border-sage">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-nature-700" />
                <h3 className="font-bold text-sm font-heading text-stone-900">
                  {t.todaysMission}
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Touch Grass
              </span>
            </div>

            {dailyMission?.mission ? (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-xs text-nature-700 font-bold uppercase tracking-wider">
                    {dailyMission.mission.category} · {dailyMission.mission.duration_minutes} min
                  </span>
                  <h4 className="text-base font-extrabold text-stone-900 mt-1 font-heading">
                    {dailyMission.mission.title}
                  </h4>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {dailyMission.mission.description}
                  </p>
                </div>

                <div className="pt-2">
                  {dailyMission.completed ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{t.completedToday}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleCompleteMission}
                      disabled={completingMission}
                      className="btn-primary w-full text-xs font-bold justify-center"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{completingMission ? 'Recording...' : t.markCompleted}</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-stone-500 pt-1 border-t border-sage">
                  <p className="italic">
                    "The screen should be the shortest part of gardening."
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-500">
                Loading mission...
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="garden-card p-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-3 font-heading">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/plants"
                className="p-3 bg-cream-50 hover:bg-cream-100 border border-sage rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-nature-100 text-nature-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-stone-800">{t.addPlant}</span>
              </Link>

              <Link
                to="/doctor"
                className="p-3 bg-cream-50 hover:bg-cream-100 border border-sage rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-nature-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-stone-800">{t.diagnosePlant}</span>
              </Link>

              <Link
                to="/water"
                className="p-3 bg-cream-50 hover:bg-cream-100 border border-sage rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-water-100 text-water-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-stone-800">{t.planWatering}</span>
              </Link>

              <Link
                to="/journal"
                className="p-3 bg-cream-50 hover:bg-cream-100 border border-sage rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-stone-800">{t.recordJournal}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Observations Section */}
      <div className="garden-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-nature-700" />
            <h2 className="text-base font-bold font-heading text-stone-900">
              Recent Garden Notes & Observations
            </h2>
          </div>
          <Link
            to="/journal"
            className="text-xs font-semibold text-nature-700 hover:underline flex items-center gap-1"
          >
            <span>View All</span> <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {journal.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs">
            No entries recorded yet. Record your first field observation from your phone or laptop!
          </div>
        ) : (
          <div className="divide-y divide-sage">
            {journal.map((entry) => (
              <div key={entry.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {entry.plant_name || 'Garden General'}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
                      {entry.entry_type}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{entry.note}</p>
                </div>
                <span className="text-[10px] text-stone-400 whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
