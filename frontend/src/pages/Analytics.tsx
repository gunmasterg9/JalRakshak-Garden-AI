import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Droplets,
  Calendar,
  Clock,
  Sparkles,
  Gauge,
  Thermometer,
  CloudRain,
  Activity,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { fetchGardenAnalytics, fetchSensorHistory } from '../api';
import { GardenAnalytics as GardenAnalyticsType, IoTSensorHistory } from '../types';

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [analytics, setAnalytics] = useState<GardenAnalyticsType | null>(null);
  const [history, setHistory] = useState<IoTSensorHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [anData, histData] = await Promise.all([
        fetchGardenAnalytics('esp32-garden-01'),
        fetchSensorHistory('esp32-garden-01', timeRange),
      ]);
      setAnalytics(anData);
      setHistory(histData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  // Helper to render responsive SVG sparkline / area charts
  const renderChart = (
    data: Array<{ value: number; timestamp: string }>,
    color: string,
    minVal: number,
    maxVal: number,
    unit: string
  ) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-44 flex items-center justify-center text-xs text-stone-400">
          No telemetry recorded in this time range.
        </div>
      );
    }

    const width = 500;
    const height = 140;
    const padding = 20;

    const points = data.map((d, i) => {
      const x = padding + (i / Math.max(1, data.length - 1)) * (width - 2 * padding);
      const normalizedY = (d.value - minVal) / Math.max(1, maxVal - minVal);
      const y = height - padding - normalizedY * (height - 2 * padding);
      return { x, y, value: d.value };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    const latest = data[data.length - 1]?.value ?? '--';

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-extrabold text-stone-900">
            {latest} <span className="text-sm font-semibold text-stone-500">{unit}</span>
          </span>
          <span className="text-[11px] font-mono text-stone-400">
            {data.length} sample points
          </span>
        </div>
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
            <defs>
              <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Background Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeDasharray="4" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeDasharray="4" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" />

            {/* Area Fill */}
            <path d={areaD} fill={`url(#grad-${color})`} />
            {/* Line Stroke */}
            <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* End Marker */}
            {points.length > 0 && (
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="4.5"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  // Process history points for chart components
  const soilSeries = (history?.soil_data || []).map((s) => ({
    value: s.moisture_percent,
    timestamp: s.timestamp,
  }));
  const tempSeries = (history?.sensor_data || [])
    .filter((s) => s.sensor_type === 'temperature')
    .map((s) => ({ value: s.value, timestamp: s.timestamp }));
  const humSeries = (history?.sensor_data || [])
    .filter((s) => s.sensor_type === 'humidity')
    .map((s) => ({ value: s.value, timestamp: s.timestamp }));
  const waterSeries = (history?.sensor_data || [])
    .filter((s) => s.sensor_type === 'water_level')
    .map((s) => ({ value: s.value, timestamp: s.timestamp }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title & Time Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sage">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-nature-700" />
            <h1 className="text-2xl font-heading font-extrabold text-stone-900 tracking-tight">
              Garden Analytics & Water Savings
            </h1>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Historical soil drying dynamics, moisture recovery tracking, and water conservation KPIs.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
          {(['1h', '6h', '24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === r
                  ? 'bg-nature-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Water Conservation KPI Hero Banner */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Water Saved KPI */}
          <div className="md:col-span-2 bg-gradient-to-br from-emerald-700 to-nature-800 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-200">
                  Water Conservation KPI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                  {analytics.water_savings.measurement_type}
                </span>
              </div>
              <div className="text-4xl font-extrabold tracking-tight">
                {analytics.water_savings.water_saved_liters} <span className="text-xl font-normal">Liters</span>
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed pt-1">
                Saved <strong>{analytics.water_savings.water_savings_percent}%</strong> compared to traditional schedule-based irrigation over the last {analytics.water_savings.days_window} days.
              </p>
            </div>
            <Droplets className="absolute right-4 bottom-2 w-32 h-32 text-white/10 -rotate-12 pointer-events-none" />
          </div>

          {/* Soil Drying Rate Card */}
          <div className="bg-white rounded-2xl border border-sage p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase">
              <TrendingDown className="w-4 h-4 text-orange-600" /> Soil Drying Rate
            </div>
            <div className="text-3xl font-extrabold text-stone-900">
              {analytics.drying_rate.drying_rate_percent_per_hour}% <span className="text-sm font-medium text-stone-500">/ hour</span>
            </div>
            <p className="text-xs text-stone-600">
              Computed from {analytics.drying_rate.samples_analyzed} historical sensor samples.
            </p>
          </div>

          {/* Moisture Recovery Card */}
          <div className="bg-white rounded-2xl border border-sage p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase">
              <Sparkles className="w-4 h-4 text-sky-600" /> Moisture Recovery
            </div>
            <div className="text-3xl font-extrabold text-stone-900">
              +{analytics.watering_effectiveness.average_recovery_percent}%
            </div>
            <p className="text-xs text-stone-600">
              Avg moisture jump per {analytics.watering_effectiveness.average_pump_runtime_seconds}s irrigation pulse.
            </p>
          </div>
        </div>
      )}

      {/* Historical Telemetry Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Soil Moisture Drying Curve */}
        <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 font-heading font-bold text-stone-900 text-sm">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <span>Soil Moisture Curve (%)</span>
            </div>
            <span className="text-xs text-stone-400 font-medium">Range: {timeRange}</span>
          </div>
          <div className="mt-4">
            {renderChart(soilSeries, '#10b981', 0, 100, '%')}
          </div>
        </div>

        {/* Ambient Temperature */}
        <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 font-heading font-bold text-stone-900 text-sm">
              <Thermometer className="w-4 h-4 text-orange-600" />
              <span>Temperature History (°C)</span>
            </div>
            <span className="text-xs text-stone-400 font-medium">Range: {timeRange}</span>
          </div>
          <div className="mt-4">
            {renderChart(tempSeries, '#f97316', 15, 45, '°C')}
          </div>
        </div>

        {/* Humidity History */}
        <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 font-heading font-bold text-stone-900 text-sm">
              <Droplets className="w-4 h-4 text-sky-600" />
              <span>Relative Humidity (%)</span>
            </div>
            <span className="text-xs text-stone-400 font-medium">Range: {timeRange}</span>
          </div>
          <div className="mt-4">
            {renderChart(humSeries, '#0284c7', 10, 100, '%')}
          </div>
        </div>

        {/* Reservoir Water Level */}
        <div className="bg-white rounded-2xl border border-sage p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 font-heading font-bold text-stone-900 text-sm">
              <CloudRain className="w-4 h-4 text-cyan-600" />
              <span>Water Tank Level (%)</span>
            </div>
            <span className="text-xs text-stone-400 font-medium">Range: {timeRange}</span>
          </div>
          <div className="mt-4">
            {renderChart(waterSeries, '#06b6d4', 0, 100, '%')}
          </div>
        </div>
      </div>
    </div>
  );
};
