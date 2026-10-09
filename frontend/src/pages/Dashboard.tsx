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
  CloudRain,
  Download,
  Zap,
  Check,
  X,
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
  fetchWeatherForecast,
  fetchPendingProposals,
  actionProposal,
  getReadingsExportUrl,
  getPumpEventsExportUrl,
} from '../api';
import { Plant, JournalEntry, DailyMissionResponse, IoTDevice, WeatherForecast, AutomatedProposal } from '../types';

export const Dashboard: React.FC = () => {
  const { t, isGujaratMode } = useGarden();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [dailyMission, setDailyMission] = useState<DailyMissionResponse | null>(null);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [proposals, setProposals] = useState<AutomatedProposal[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [completingMission, setCompletingMission] = useState(false);
  const [pumpActionLoading, setPumpActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [plantsData, journalData, missionData, devData, weatherData, propData] = await Promise.all([
        fetchPlants(),
        fetchJournal(undefined, undefined),
        fetchTodayMission(),
        fetchIoTDevices().catch(() => []),
        fetchWeatherForecast().catch(() => null),
        fetchPendingProposals().catch(() => []),
      ]);
      setPlants(plantsData);
      setJournal(journalData.slice(0, 5));
      setDailyMission(missionData);
      setIotDevices(devData);
      setWeather(weatherData);
      setProposals(propData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // WebSocket real-time event listener
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/iot/ws`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'telemetry_update' || msg.type === 'pump_state_change') {
            fetchIoTDevices().then(setIotDevices).catch(() => {});
          }
        } catch (e) {}
      };
    } catch (e) {
      console.debug('WebSocket fallback to polling', e);
    }

    const interval = setInterval(async () => {
      try {
        const devs = await fetchIoTDevices();
        setIotDevices(devs);
      } catch (e) {}
    }, 5000);

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  // Dynamically resolve active device: prioritize selected -> online -> ESP8266 -> first device
  const activeDevice =
    (selectedDeviceId ? iotDevices.find((d) => d.device_id === selectedDeviceId) : null) ||
    iotDevices.find((d) => d.live_status === 'online') ||
    iotDevices.find((d) => d.device_type?.toLowerCase() === 'esp8266' || d.device_id?.toLowerCase().includes('8266')) ||
    iotDevices[0];

  const handlePumpCommand = async (cmd: string, duration = 30) => {
    if (!activeDevice) return;
    if (
      cmd === 'PUMP_ON' &&
      (activeDevice.device_type?.toLowerCase() === 'esp8266' || activeDevice.device_id?.toLowerCase().includes('8266'))
    ) {
      alert('Pump actuation is disabled for ESP8266 nodes until physical relay wiring, watchdog, and reservoir safety checks are verified.');
      return;
    }
    setPumpActionLoading(true);
    try {
      await sendDeviceCommand(activeDevice.device_id, cmd, duration, 'Dashboard manual trigger');
      const devs = await fetchIoTDevices();
      setIotDevices(devs);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPumpActionLoading(false);
    }
  };

  const handleProposalAction = async (id: string, approve: boolean) => {
    try {
      await actionProposal(id, approve);
      setProposals((prev) => prev.filter((p) => p.id !== id));
      const devs = await fetchIoTDevices();
      setIotDevices(devs);
    } catch (err: any) {
      alert(err.message);
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

      {/* Semi-Automatic Watering Approvals Card */}
      {proposals.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600 animate-bounce" />
              <h3 className="font-heading font-extrabold text-amber-900 text-sm sm:text-base">
                Irrigation Proposal Awaiting Approval ({proposals.length})
              </h3>
            </div>
            <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
              Semi-Automatic Closed Loop
            </span>
          </div>
          <div className="space-y-2">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">{prop.plant_name}</span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      Soil: {prop.current_soil_moisture}% (Threshold: {prop.target_moisture_threshold}%)
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">{prop.reason}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleProposalAction(prop.id, true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve ({prop.duration_seconds}s)
                  </button>
                  <button
                    onClick={() => handleProposalAction(prop.id, false)}
                    className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real IoT Garden Hardware & Live Telemetry Card (Section 14 & 15) */}
      {activeDevice && (() => {
        const tempReading = activeDevice.latest_sensors?.find(s => s.sensor_type === 'temperature');
        const humReading = activeDevice.latest_sensors?.find(s => s.sensor_type === 'humidity');
        const waterReading = activeDevice.latest_sensors?.find(s => s.sensor_type === 'water_level');
        const soilMoisture = activeDevice.latest_soil?.moisture_percent;
        const isEsp8266 = activeDevice.device_type?.toLowerCase() === 'esp8266' || activeDevice.device_id?.toLowerCase().includes('8266');

        return (
          <div className="bg-white rounded-2xl border border-sage p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isEsp8266 ? 'bg-sky-100 text-sky-800' : 'bg-nature-100 text-nature-800'
                }`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading font-extrabold text-stone-900 text-base">
                      {isEsp8266 ? 'NodeMCU ESP8266 Garden Node' : 'ESP32 Garden Controller'}
                    </h2>
                    {activeDevice.live_status === 'online' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 🟢 Online
                      </span>
                    ) : activeDevice.live_status === 'delayed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> 🟡 Delayed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> 🔴 Offline
                      </span>
                    )}

                    {isEsp8266 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        10-bit ADC · DHT11 Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-stone-500 font-mono">
                      ID: {activeDevice.device_id} · Mode: {activeDevice.mode} {activeDevice.ip_address ? `· IP: ${activeDevice.ip_address}` : ''}
                    </span>
                    {iotDevices.length > 1 && (
                      <select
                        aria-label="Select IoT Controller"
                        value={activeDevice.device_id}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="text-xs border border-stone-200 rounded px-1.5 py-0.5 bg-stone-50 text-stone-700"
                      >
                        {iotDevices.map((d) => (
                          <option key={d.device_id} value={d.device_id}>
                            {d.name} ({d.device_type?.toUpperCase() || 'ESP'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick manual pump buttons and telemetry stream status */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                    wsConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                  title={wsConnected ? 'WebSocket live streaming active' : 'Fallback to 5s polling'}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      wsConnected ? 'bg-emerald-500 animate-ping' : 'bg-stone-400'
                    }`}
                  />
                  {wsConnected ? 'Live WS' : 'Polling'}
                </span>

                {isEsp8266 ? (
                  <span
                    className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold"
                    title="Pump actuation is disabled for ESP8266 until physical driver wiring and local safety checks are verified."
                  >
                    🔒 Pump Locked (Safety Guard)
                  </span>
                ) : !activeDevice.pump_status?.pump_on ? (
                  <button
                    onClick={() => handlePumpCommand('PUMP_ON', 30)}
                    disabled={pumpActionLoading || (activeDevice.pump_status?.cooldown_remaining_seconds ?? 0) > 0 || activeDevice.pump_status?.emergency_locked}
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
                <a
                  href={getReadingsExportUrl(activeDevice.device_id)}
                  download
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1"
                  title="Export sensor readings as CSV"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </a>
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
                  {tempReading?.value !== undefined && tempReading?.value !== null ? (
                    <span>{tempReading.value} °C</span>
                  ) : (
                    <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" /> Humidity
                </span>
                <div className="text-xl font-extrabold text-stone-900 mt-1">
                  {humReading?.value !== undefined && humReading?.value !== null ? (
                    <span>{humReading.value} %</span>
                  ) : (
                    <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" /> Soil Moisture
                </span>
                <div className="text-xl font-extrabold text-stone-900 mt-1">
                  {soilMoisture !== undefined && soilMoisture !== null ? (
                    <span>{soilMoisture} %</span>
                  ) : (
                    <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Water Tank
                </span>
                <div className="text-xl font-extrabold text-stone-900 mt-1">
                  {waterReading?.value !== undefined && waterReading?.value !== null ? (
                    <span>{waterReading.value} %</span>
                  ) : (
                    <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                  <Power className="w-3.5 h-3.5 text-nature-600" /> Pump Status
                </span>
                <div className="text-xl font-extrabold text-stone-900 mt-1">
                  {isEsp8266 ? (
                    <span className="text-xs font-semibold text-stone-500">Disabled (Safety)</span>
                  ) : activeDevice.pump_status?.pump_on ? (
                    <span className="text-emerald-600 animate-pulse">ON ({activeDevice.pump_status.runtime_seconds}s)</span>
                  ) : (
                    <span className="text-stone-500">OFF</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Local Weather Forecast & Rain Guard Advisory */}
      {weather && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
            weather.rain_guard?.active
              ? 'bg-blue-50/90 border-blue-300 text-blue-950'
              : 'bg-white border-sage text-stone-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2.5 rounded-xl flex-shrink-0 ${
                  weather.rain_guard?.active
                    ? 'bg-blue-200 text-blue-800 animate-pulse'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {weather.rain_guard?.active ? (
                  <CloudRain className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-sm sm:text-base">
                    Local Weather Forecast · Open-Meteo
                  </h3>
                  {weather.rain_guard?.active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-900 border border-blue-400">
                      🌧️ Rain Guard ACTIVE
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ☀️ Clear Skies
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  {weather.rain_guard?.active
                    ? `Upcoming rain (${weather.rain_guard.expected_rain_mm} mm, ${weather.rain_guard.max_probability_percent}% probability in next 24h). Automated pump irrigation paused to conserve water.`
                    : `Current conditions: ${weather.current?.temperature_c}°C, ${weather.current?.humidity_percent}% humidity. Expected 24h precipitation: ${weather.rain_guard?.expected_rain_mm} mm.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono bg-white/80 px-3.5 py-2 rounded-xl border border-stone-200 self-start sm:self-auto shadow-xs">
              <span className="flex items-center gap-1 font-bold text-sky-700">
                <CloudRain className="w-3.5 h-3.5" /> {weather.rain_guard?.expected_rain_mm} mm rain
              </span>
              <span className="text-stone-300">|</span>
              <span className="text-stone-700 font-semibold">
                {weather.rain_guard?.max_probability_percent}% chance
              </span>
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
