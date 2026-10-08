import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Radio,
  Power,
  AlertTriangle,
  RefreshCw,
  Gauge,
  Thermometer,
  Droplets,
  Sliders,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Play,
  Square,
} from 'lucide-react';
import {
  fetchIoTDevices,
  sendDeviceCommand,
  calibrateSoil,
  sendDemoTelemetry,
} from '../api';
import { IoTDevice } from '../types';
import { useGarden } from '../context/GardenContext';

export const IoTDevices: React.FC = () => {
  const { t } = useGarden();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState('esp32-garden-01');
  const [runtimeSeconds, setRuntimeSeconds] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [demoScenario, setDemoScenario] = useState('hot_afternoon');
  const [calibrating, setCalibrating] = useState(false);

  const loadDevices = async () => {
    try {
      const data = await fetchIoTDevices();
      setDevices(data);
      if (data.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(data[0].device_id);
      }
    } catch (err: any) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 4000); // 4-second real-time polling
    return () => clearInterval(interval);
  }, []);

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId) || devices[0];

  const handleCommand = async (command: string, duration?: number) => {
    if (!selectedDevice) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await sendDeviceCommand(selectedDevice.device_id, command, duration || runtimeSeconds, 'User dashboard action');
      setStatusMessage({
        text: `Command ${command} sent successfully. ${res.safety_note || ''}`,
        type: 'success',
      });
      await loadDevices();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalibrate = async (step: 'dry' | 'wet') => {
    if (!selectedDevice) return;
    setCalibrating(true);
    try {
      const raw = selectedDevice.latest_soil?.raw_adc || (step === 'dry' ? 3200 : 1400);
      await calibrateSoil(selectedDevice.device_id, { step, raw_reading: raw });
      setStatusMessage({
        text: `Calibrated ${step.toUpperCase()} reading with raw ADC ${raw}`,
        type: 'success',
      });
      await loadDevices();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setCalibrating(false);
    }
  };

  const handleSendDemo = async () => {
    if (!selectedDevice) return;
    setActionLoading(true);
    try {
      await sendDemoTelemetry(selectedDevice.device_id, demoScenario);
      setStatusMessage({
        text: `⚠ DEMO SENSOR DATA injected (${demoScenario}). Clearly marked in history.`,
        type: 'warning',
      });
      await loadDevices();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: 'online' | 'delayed' | 'offline') => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 🟢 Online
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 🟡 Delayed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> 🔴 Offline
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sage">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-nature-700" />
            <h1 className="text-2xl font-heading font-extrabold text-stone-900 tracking-tight">
              IoT Controllers & Live Sensors
            </h1>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Real ESP32 hardware telemetry, multi-layer pump protection, and soil ADC calibration.
          </p>
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {selectedDevice ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controller & Live Readings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controller Card */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-nature-100 flex items-center justify-center text-nature-800">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-stone-900 text-lg">
                      {selectedDevice.name}
                    </h2>
                    <span className="text-xs text-stone-500 font-mono">
                      ID: {selectedDevice.device_id} | IP: {selectedDevice.ip_address || 'DHCP'}
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(selectedDevice.live_status)}</div>
              </div>

              {/* Live Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                {/* Temperature */}
                <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800">
                    <Thermometer className="w-4 h-4 text-orange-600" /> Temperature
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-2">
                    {selectedDevice.latest_sensors?.find((s) => s.sensor_type === 'temperature')?.value ?? '--'} °C
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">DHT11 Sensor</div>
                </div>

                {/* Humidity */}
                <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                    <Droplets className="w-4 h-4 text-sky-600" /> Humidity
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-2">
                    {selectedDevice.latest_sensors?.find((s) => s.sensor_type === 'humidity')?.value ?? '--'} %
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">Relative RH</div>
                </div>

                {/* Soil Moisture */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Gauge className="w-4 h-4 text-emerald-600" /> Soil Moisture
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-2">
                    {selectedDevice.latest_soil?.moisture_percent ?? '--'} %
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    ADC: {selectedDevice.latest_soil?.raw_adc ?? 'N/A'}
                  </div>
                </div>

                {/* Water Tank */}
                <div className="p-4 bg-cyan-50/60 rounded-xl border border-cyan-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800">
                    <Droplets className="w-4 h-4 text-cyan-600" /> Water Tank
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-2">
                    {selectedDevice.latest_sensors?.find((s) => s.sensor_type === 'water_level')?.value ?? '--'} %
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {(selectedDevice.latest_sensors?.find((s) => s.sensor_type === 'water_level')?.value ?? 0) <= 15
                      ? '⚠ CRITICAL'
                      : 'NORMAL'}
                  </div>
                </div>
              </div>

              {selectedDevice.latest_soil?.is_simulated ? (
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>⚠ DEMO SENSOR DATA — This device is currently displaying simulated values for testing.</span>
                </div>
              ) : null}
            </div>

            {/* Actuator & Safety System Control Card */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2 font-heading font-bold text-stone-900">
                  <Power className="w-5 h-5 text-nature-700" />
                  <span>Pump Actuator & Safety Guard</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDevice.pump_status.emergency_locked && (
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-bold">
                      EMERGENCY LOCKOUT
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedDevice.pump_status.pump_on
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    Pump: {selectedDevice.pump_status.pump_on ? 'ACTIVE (PUMPING)' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Pump Runtime Tracker */}
              {selectedDevice.pump_status.pump_on && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600 animate-spin" />
                    <span className="font-bold text-sm">
                      Running: {selectedDevice.pump_status.runtime_seconds}s
                    </span>
                  </div>
                  <span className="text-xs font-medium">
                    Auto-stop in: {Math.round(selectedDevice.pump_status.remaining_seconds)}s
                  </span>
                </div>
              )}

              {/* Cooldown Warning */}
              {selectedDevice.pump_status.cooldown_remaining_seconds > 0 && !selectedDevice.pump_status.pump_on && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-medium text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>
                    Pump Cooldown Active: Please wait {selectedDevice.pump_status.cooldown_remaining_seconds}s before restarting to protect the motor.
                  </span>
                </div>
              )}

              {/* Runtime Duration Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-stone-700 mb-1">
                  <span>Activation Runtime Limit</span>
                  <span className="text-nature-800">{runtimeSeconds} seconds (Max 60s)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={runtimeSeconds}
                  disabled={selectedDevice.pump_status.pump_on}
                  onChange={(e) => setRuntimeSeconds(Number(e.target.value))}
                  className="w-full accent-nature-600 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {!selectedDevice.pump_status.pump_on ? (
                  <button
                    onClick={() => handleCommand('PUMP_ON')}
                    disabled={actionLoading || selectedDevice.pump_status.cooldown_remaining_seconds > 0 || selectedDevice.pump_status.emergency_locked}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-nature-700 hover:bg-nature-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                  >
                    <Play className="w-4 h-4" /> Start Pump ({runtimeSeconds}s)
                  </button>
                ) : (
                  <button
                    onClick={() => handleCommand('PUMP_OFF')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-700 hover:bg-stone-800 text-white rounded-xl text-sm font-bold shadow-sm"
                  >
                    <Square className="w-4 h-4" /> Turn Off Pump
                  </button>
                )}

                {/* Emergency Stop Button */}
                <button
                  onClick={() => handleCommand('EMERGENCY_STOP')}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  <ShieldAlert className="w-4 h-4" /> ⛔ STOP PUMP
                </button>

                {selectedDevice.pump_status.emergency_locked ? (
                  <button
                    onClick={() => handleCommand('CLEAR_EMERGENCY')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm"
                  >
                    Clear Emergency Lock
                  </button>
                ) : (
                  <button
                    onClick={() => handleCommand('REQUEST_SENSOR_READING')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-sm font-bold shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" /> Sample Now
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Calibration & Demo Mode */}
          <div className="space-y-6">
            {/* Calibration Tool */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-heading font-bold text-stone-900 border-b border-stone-100 pb-3">
                <Sliders className="w-5 h-5 text-nature-700" />
                <span>Soil Sensor Calibration</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Raw 12-bit ADC values (0–4095) vary by sensor. Calibrate dry air (3200) vs full water (1400) to ensure accurate percentage.
              </p>

              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Current Raw ADC:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedDevice.latest_soil?.raw_adc ?? 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Dry Value (Air):</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedDevice.calibration?.dry_value ?? 3200}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Wet Value (Water):</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedDevice.calibration?.wet_value ?? 1400}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-bold text-emerald-700 capitalize">
                    {selectedDevice.calibration?.status ?? 'uncalibrated'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => handleCalibrate('dry')}
                  disabled={calibrating}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all border border-stone-300"
                >
                  Save Dry (Air)
                </button>
                <button
                  onClick={() => handleCalibrate('wet')}
                  disabled={calibrating}
                  className="px-3 py-2.5 bg-nature-100 hover:bg-nature-200 text-nature-900 rounded-xl text-xs font-bold transition-all border border-nature-300"
                >
                  Save Wet (Water)
                </button>
              </div>
            </div>

            {/* Simulated Demo Mode Box (Section 34) */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-heading font-bold text-stone-900 border-b border-stone-100 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Simulation / Demo Mode</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Test the watering rules engine and AI responses without physical hardware. Data injected is clearly tagged with the <code>is_simulated</code> flag.
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Preset Weather Scenario
                </label>
                <select
                  value={demoScenario}
                  onChange={(e) => setDemoScenario(e.target.value)}
                  className="w-full text-xs font-medium bg-stone-50 border border-stone-300 rounded-xl p-2.5 focus:ring-2 focus:ring-nature-500 outline-none"
                >
                  <option value="hot_afternoon">🔥 Hot Afternoon (34.2°C, 27.5% Soil)</option>
                  <option value="dry_stress">🏜 Critical Drought Stress (36.5°C, 18% Soil)</option>
                  <option value="morning_dew">🌿 Cool Morning Dew (24°C, 55% Soil)</option>
                  <option value="full_tank">💧 Full Reservoir Optimal (29°C, 48% Soil)</option>
                </select>
              </div>

              <button
                onClick={handleSendDemo}
                disabled={actionLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Inject Demo Telemetry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-sage">
          <p className="text-stone-500">No IoT devices registered yet.</p>
        </div>
      )}
    </div>
  );
};
