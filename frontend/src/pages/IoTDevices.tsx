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
  Download,
  Wifi,
  Info,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchIoTDevices,
  fetchDeviceDiagnostics,
  sendDeviceCommand,
  calibrateSoil,
  sendDemoTelemetry,
  getReadingsExportUrl,
  getPumpEventsExportUrl,
} from '../api';
import { IoTDevice } from '../types';
import { useGarden } from '../context/GardenContext';

export const IoTDevices: React.FC = () => {
  const { t } = useGarden();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [runtimeSeconds, setRuntimeSeconds] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [demoScenario, setDemoScenario] = useState('hot_afternoon');
  const [calibrating, setCalibrating] = useState(false);
  const [showWiringGuide, setShowWiringGuide] = useState(true);

  const loadDevices = async () => {
    try {
      const data = await fetchIoTDevices();
      setDevices(data);
      if (data.length > 0) {
        if (!selectedDeviceId) {
          // Prioritize online or esp8266 device
          const preferred =
            data.find((d) => d.live_status === 'online') ||
            data.find((d) => d.device_type?.toLowerCase() === 'esp8266' || d.device_id?.includes('8266')) ||
            data[0];
          setSelectedDeviceId(preferred.device_id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDiagnostics = async (devId: string) => {
    if (!devId) return;
    setDiagnosticsLoading(true);
    try {
      const diag = await fetchDeviceDiagnostics(devId);
      setDiagnostics(diag);
    } catch (err) {
      console.debug('Failed to load diagnostics:', err);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 4000); // 4-second real-time polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      loadDiagnostics(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const selectedDevice =
    (selectedDeviceId ? devices.find((d) => d.device_id === selectedDeviceId) : null) ||
    devices[0];

  const isEsp8266 =
    selectedDevice?.device_type?.toLowerCase() === 'esp8266' ||
    selectedDevice?.device_id?.toLowerCase().includes('8266');

  const handleCommand = async (command: string, duration?: number) => {
    if (!selectedDevice) return;
    if (command === 'PUMP_ON' && isEsp8266) {
      setStatusMessage({
        text: 'Pump actuation is locked for ESP8266 nodes pending physical relay module and reservoir safety verification.',
        type: 'warning',
      });
      return;
    }
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await sendDeviceCommand(selectedDevice.device_id, command, duration || runtimeSeconds, 'User dashboard action');
      setStatusMessage({
        text: `Command ${command} sent successfully. ${res.safety_note || ''}`,
        type: 'success',
      });
      await loadDevices();
      if (selectedDeviceId) await loadDiagnostics(selectedDeviceId);
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
      const defDry = isEsp8266 ? 800 : 3200;
      const defWet = isEsp8266 ? 350 : 1400;
      const raw = selectedDevice.latest_soil?.raw_adc ?? (step === 'dry' ? defDry : defWet);
      await calibrateSoil(selectedDevice.device_id, { step, raw_reading: raw });
      setStatusMessage({
        text: `Calibrated ${step.toUpperCase()} reading with raw ADC ${raw}`,
        type: 'success',
      });
      await loadDevices();
      if (selectedDeviceId) await loadDiagnostics(selectedDeviceId);
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
      if (selectedDeviceId) await loadDiagnostics(selectedDeviceId);
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

  const tempReading = selectedDevice?.latest_sensors?.find((s) => s.sensor_type === 'temperature');
  const humReading = selectedDevice?.latest_sensors?.find((s) => s.sensor_type === 'humidity');
  const waterReading = selectedDevice?.latest_sensors?.find((s) => s.sensor_type === 'water_level');
  const soilMoisture = selectedDevice?.latest_soil?.moisture_percent;

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
            Real NodeMCU ESP8266 and ESP32 hardware telemetry, multi-layer pump protection, and soil ADC calibration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {devices.length > 1 && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-bold text-stone-600">Controller:</span>
              <select
                aria-label="Select IoT Device"
                value={selectedDevice?.device_id || ''}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 shadow-xs focus:ring-2 focus:ring-nature-500 outline-none"
              >
                {devices.map((d) => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.name} ({d.device_type?.toUpperCase() || 'ESP'} · {d.live_status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <a
            href={getReadingsExportUrl(selectedDevice?.device_id)}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs"
            title="Download full sensor telemetry as CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" /> Export Readings CSV
          </a>
          <a
            href={getPumpEventsExportUrl(selectedDevice?.device_id)}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs"
            title="Download pump audit history as CSV"
          >
            <Download className="w-3.5 h-3.5 text-nature-600" /> Export Pump Log CSV
          </a>
          <button
            onClick={() => {
              loadDevices();
              if (selectedDeviceId) loadDiagnostics(selectedDeviceId);
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
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
          <button onClick={() => setStatusMessage(null)} className="text-xs font-bold underline ml-4 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {selectedDevice ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controller & Live Readings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controller Card */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isEsp8266 ? 'bg-sky-100 text-sky-800' : 'bg-nature-100 text-nature-800'
                    }`}
                  >
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading font-bold text-stone-900 text-lg">
                        {selectedDevice.name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          isEsp8266
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-nature-100 text-nature-800 border border-nature-200'
                        }`}
                      >
                        {isEsp8266 ? 'ESP8266 NodeMCU V3 (10-bit ADC)' : 'ESP32 Dual-Core (12-bit ADC)'}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 font-mono">
                      ID: {selectedDevice.device_id} | IP: {selectedDevice.ip_address || 'DHCP'} | Mode: {selectedDevice.mode}
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
                    {tempReading?.value !== undefined && tempReading?.value !== null ? (
                      `${tempReading.value} °C`
                    ) : (
                      <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">DHT11 Sensor (GPIO4 / D2)</div>
                </div>

                {/* Humidity */}
                <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                    <Droplets className="w-4 h-4 text-sky-600" /> Humidity
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-2">
                    {humReading?.value !== undefined && humReading?.value !== null ? (
                      `${humReading.value} %`
                    ) : (
                      <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">Relative RH (DHT11)</div>
                </div>

                {/* Soil Moisture */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Gauge className="w-4 h-4 text-emerald-600" /> Soil Moisture
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-2">
                    {soilMoisture !== undefined && soilMoisture !== null ? (
                      `${soilMoisture} %`
                    ) : (
                      <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    ADC: {selectedDevice.latest_soil?.raw_adc !== undefined && selectedDevice.latest_soil?.raw_adc !== null ? selectedDevice.latest_soil.raw_adc : 'N/A'} (Pin A0)
                  </div>
                </div>

                {/* Water Tank */}
                <div className="p-4 bg-cyan-50/60 rounded-xl border border-cyan-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800">
                    <Droplets className="w-4 h-4 text-cyan-600" /> Water Tank
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-2">
                    {waterReading?.value !== undefined && waterReading?.value !== null ? (
                      `${waterReading.value} %`
                    ) : (
                      <span className="text-xs font-semibold text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {waterReading?.value !== undefined && waterReading?.value !== null ? (
                      waterReading.value <= 15 ? (
                        <span className="text-rose-600 font-bold">⚠ CRITICAL</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">NORMAL</span>
                      )
                    ) : (
                      'Float Sensor Optional'
                    )}
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
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2 font-heading font-bold text-stone-900">
                  <Power className="w-5 h-5 text-nature-700" />
                  <span>Pump Actuator & Safety Guard</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDevice.pump_status?.emergency_locked && (
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-bold">
                      EMERGENCY LOCKOUT
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedDevice.pump_status?.pump_on
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    Pump: {selectedDevice.pump_status?.pump_on ? 'ACTIVE (PUMPING)' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* ESP8266 Lockout Notice */}
              {isEsp8266 && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Hardware Safety Guard: Actuation Locked for NodeMCU ESP8266</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Pump actuation commands are strictly disabled on the NodeMCU controller pending physical relay module wiring, optocoupler/flyback diode protection, and float switch verification.
                  </p>
                </div>
              )}

              {/* Pump Runtime Tracker */}
              {selectedDevice.pump_status?.pump_on && (
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
              {(selectedDevice.pump_status?.cooldown_remaining_seconds ?? 0) > 0 && !selectedDevice.pump_status?.pump_on && (
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
                  disabled={selectedDevice.pump_status?.pump_on || isEsp8266}
                  onChange={(e) => setRuntimeSeconds(Number(e.target.value))}
                  className="w-full accent-nature-600 cursor-pointer disabled:opacity-40"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {isEsp8266 ? (
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-200 text-stone-500 rounded-xl text-xs font-bold cursor-not-allowed"
                    title="Pump actuation is locked for ESP8266"
                  >
                    🔒 Pump Locked (Safety Guard)
                  </button>
                ) : !selectedDevice.pump_status?.pump_on ? (
                  <button
                    onClick={() => handleCommand('PUMP_ON')}
                    disabled={
                      actionLoading ||
                      (selectedDevice.pump_status?.cooldown_remaining_seconds ?? 0) > 0 ||
                      selectedDevice.pump_status?.emergency_locked
                    }
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-nature-700 hover:bg-nature-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4" /> Start Pump ({runtimeSeconds}s)
                  </button>
                ) : (
                  <button
                    onClick={() => handleCommand('PUMP_OFF')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-700 hover:bg-stone-800 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
                  >
                    <Square className="w-4 h-4" /> Turn Off Pump
                  </button>
                )}

                {/* Emergency Stop Button */}
                <button
                  onClick={() => handleCommand('EMERGENCY_STOP')}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" /> ⛔ STOP PUMP
                </button>

                {selectedDevice.pump_status?.emergency_locked ? (
                  <button
                    onClick={() => handleCommand('CLEAR_EMERGENCY')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
                  >
                    Clear Emergency Lock
                  </button>
                ) : (
                  <button
                    onClick={() => handleCommand('REQUEST_SENSOR_READING')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-sm font-bold shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Sample Now
                  </button>
                )}
              </div>
            </div>

            {/* Hardware Setup & Wiring Reference Collapsible */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-xs space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowWiringGuide(!showWiringGuide)}
              >
                <div className="flex items-center gap-2 font-heading font-bold text-stone-900">
                  <Layers className="w-5 h-5 text-nature-700" />
                  <span>LOLIN NodeMCU V3 ESP8266 Hardware Pinout & Wiring</span>
                </div>
                <button className="text-stone-500 hover:text-stone-800">
                  {showWiringGuide ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {showWiringGuide && (
                <div className="pt-2 space-y-4 text-xs text-stone-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-stone-200 rounded-lg">
                      <thead>
                        <tr className="bg-stone-100 text-stone-800 font-bold">
                          <th className="p-2 border border-stone-200">Component</th>
                          <th className="p-2 border border-stone-200">Sensor Pin</th>
                          <th className="p-2 border border-stone-200">NodeMCU Pin</th>
                          <th className="p-2 border border-stone-200">ESP8266 GPIO</th>
                          <th className="p-2 border border-stone-200">Electrical Spec</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-stone-50">
                          <td className="p-2 font-bold text-orange-800 border border-stone-200">DHT11 Temp / Humidity</td>
                          <td className="p-2 border border-stone-200">DATA (Pin 2)</td>
                          <td className="p-2 font-mono font-bold text-sky-700 border border-stone-200">D2</td>
                          <td className="p-2 font-mono border border-stone-200">GPIO4</td>
                          <td className="p-2 border border-stone-200">3.3V logic · 10kΩ pull-up resistor to 3V3</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-2 font-bold text-orange-800 border border-stone-200">DHT11 Power</td>
                          <td className="p-2 border border-stone-200">VCC / GND</td>
                          <td className="p-2 font-mono border border-stone-200">3V3 / GND</td>
                          <td className="p-2 font-mono border border-stone-200">—</td>
                          <td className="p-2 border border-stone-200">3.3V power rail</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-2 font-bold text-emerald-800 border border-stone-200">Soil Moisture (LM393)</td>
                          <td className="p-2 border border-stone-200">AOUT (Analog)</td>
                          <td className="p-2 font-mono font-bold text-emerald-700 border border-stone-200">A0</td>
                          <td className="p-2 font-mono border border-stone-200">A0 (ADC0)</td>
                          <td className="p-2 border border-stone-200">10-bit ADC (0–1023) · Board divider supports 0–3.3V</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-2 font-bold text-emerald-800 border border-stone-200">Soil Sensor Power</td>
                          <td className="p-2 border border-stone-200">VCC / GND</td>
                          <td className="p-2 font-mono border border-stone-200">3V3 / GND</td>
                          <td className="p-2 font-mono border border-stone-200">—</td>
                          <td className="p-2 border border-stone-200">3.3V logic (Max 3.3V input to A0)</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-2 font-bold text-stone-800 border border-stone-200">Serial UART (CH340)</td>
                          <td className="p-2 border border-stone-200">Micro USB</td>
                          <td className="p-2 font-mono border border-stone-200">USB Port</td>
                          <td className="p-2 font-mono border border-stone-200">TXD0 / RXD0</td>
                          <td className="p-2 border border-stone-200">COM4 · 115200 baud · Host PC</td>
                        </tr>
                        <tr className="hover:bg-stone-50 bg-amber-50/50">
                          <td className="p-2 font-bold text-amber-900 border border-stone-200">Mini DC Pump</td>
                          <td className="p-2 border border-stone-200">Motor Leads</td>
                          <td className="p-2 font-bold text-amber-800 border border-stone-200">LOCKED</td>
                          <td className="p-2 font-mono border border-stone-200">—</td>
                          <td className="p-2 border border-stone-200">Actuation disabled for safety</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sky-900">ADC Voltage Divider Architecture: </span>
                      <span className="text-sky-800">
                        The LOLIN NodeMCU V3 includes an onboard resistor voltage divider (220kΩ / 100kΩ) connected to pin A0, allowing external signals up to 3.3V to be safely sampled. Raw ESP8266EX bare-chip ADC pins have a strict 1.0V maximum limit.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Diagnostics Card */}
            {diagnostics && (
              <div className="bg-white rounded-2xl border border-sage p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2 font-heading font-bold text-stone-900">
                    <Activity className="w-5 h-5 text-nature-700" />
                    <span>Real-Time Controller Diagnostics</span>
                  </div>
                  <span className="text-xs font-mono text-stone-500">
                    Resolution: {diagnostics.adc_specs?.resolution_bits}-bit ({diagnostics.adc_specs?.max_raw_value} max)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-semibold">Controller Architecture</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">{diagnostics.device_type}</div>
                    <div className="text-[11px] text-stone-500 mt-1">{diagnostics.adc_specs?.voltage_limit}</div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-semibold">Connection Liveness</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5 capitalize flex items-center gap-1.5">
                      {diagnostics.live_status === 'online' ? '🟢 Online' : diagnostics.live_status === 'delayed' ? '🟡 Delayed' : '🔴 Offline'}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                      {diagnostics.last_seen_seconds_ago !== null
                        ? `Last heartbeat: ${diagnostics.last_seen_seconds_ago}s ago`
                        : 'No heartbeat recorded'}
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-semibold">Network Binding</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5 font-mono">{diagnostics.ip_address}</div>
                    <div className="text-[11px] text-stone-500 mt-1">Timeout: {diagnostics.heartbeat_timeout_seconds}s</div>
                  </div>
                </div>

                {/* Sensor Health Status Table */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-stone-800 block mb-2">Sensor Health Matrix</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800">DHT11 Temp/RH</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            diagnostics.sensor_health?.dht11?.status === 'connected'
                              ? 'bg-emerald-100 text-emerald-800'
                              : diagnostics.sensor_health?.dht11?.status === 'degraded'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {diagnostics.sensor_health?.dht11?.status?.replace('_', ' ') || 'unknown'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1">
                        {diagnostics.sensor_health?.dht11?.last_temperature !== null && diagnostics.sensor_health?.dht11?.last_temperature !== undefined
                          ? `${diagnostics.sensor_health.dht11.last_temperature} °C / ${diagnostics.sensor_health.dht11.last_humidity} %`
                          : 'No readings received'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800">Soil Probe</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            diagnostics.sensor_health?.soil_moisture?.status === 'connected'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {diagnostics.sensor_health?.soil_moisture?.status?.replace('_', ' ') || 'unknown'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1">
                        {diagnostics.sensor_health?.soil_moisture?.moisture_percent !== null && diagnostics.sensor_health?.soil_moisture?.moisture_percent !== undefined
                          ? `${diagnostics.sensor_health.soil_moisture.moisture_percent} % (ADC ${diagnostics.sensor_health.soil_moisture.raw_adc})`
                          : 'Probe not connected'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800">Water Tank Float</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            diagnostics.sensor_health?.water_tank?.status === 'connected'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {diagnostics.sensor_health?.water_tank?.status?.replace('_', ' ') || 'not connected'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1">Float sensor optional</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Calibration & Demo Mode */}
          <div className="space-y-6">
            {/* Calibration Tool */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-heading font-bold text-stone-900 border-b border-stone-100 pb-3">
                <Sliders className="w-5 h-5 text-nature-700" />
                <span>Soil Sensor Calibration</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Raw {isEsp8266 ? '10-bit ADC values (0–1023)' : '12-bit ADC values (0–4095)'} vary by sensor. Calibrate dry air ({isEsp8266 ? '800' : '3200'}) vs full water ({isEsp8266 ? '350' : '1400'}) to ensure accurate soil percentage.
              </p>

              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Current Raw ADC:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedDevice.latest_soil?.raw_adc !== undefined && selectedDevice.latest_soil?.raw_adc !== null
                      ? selectedDevice.latest_soil.raw_adc
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">ADC Bit Depth:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {isEsp8266 ? '10-bit (0–1023)' : '12-bit (0–4095)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Dry Value (Air):</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedDevice.calibration?.dry_value ?? (isEsp8266 ? 800 : 3200)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Wet Value (Water):</span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedDevice.calibration?.wet_value ?? (isEsp8266 ? 350 : 1400)}
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
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all border border-stone-300 cursor-pointer"
                >
                  Save Dry (Air)
                </button>
                <button
                  onClick={() => handleCalibrate('wet')}
                  disabled={calibrating}
                  className="px-3 py-2.5 bg-nature-100 hover:bg-nature-200 text-nature-900 rounded-xl text-xs font-bold transition-all border border-nature-300 cursor-pointer"
                >
                  Save Wet (Water)
                </button>
              </div>
            </div>

            {/* Simulated Demo Mode Box (Section 34) */}
            <div className="bg-white rounded-2xl border border-sage p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-heading font-bold text-stone-900 border-b border-stone-100 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Simulation / Demo Mode</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Test the watering rules engine and AI responses without physical hardware. Injected telemetry is strictly flagged with <code>is_simulated</code>.
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
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
