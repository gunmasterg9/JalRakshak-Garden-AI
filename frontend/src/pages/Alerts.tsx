import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { fetchIoTAlerts, resolveIoTAlert } from '../api';
import { IoTAlert } from '../types';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<IoTAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState(true);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await fetchIoTAlerts(filterActive);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterActive]);

  const handleResolve = async (id: number) => {
    try {
      await resolveIoTAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-sky-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sage">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="w-6 h-6 text-nature-700" />
            <h1 className="text-2xl font-heading font-extrabold text-stone-900 tracking-tight">
              Safety & Garden Alerts Center
            </h1>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Real-time notifications for critical soil dryness, reservoir cutoffs, pump watchdogs, and hardware disconnects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterActive(!filterActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filterActive
                ? 'bg-nature-100 text-nature-800 border-nature-300'
                : 'bg-white text-stone-700 border-stone-300'
            }`}
          >
            {filterActive ? 'Showing Active Alerts' : 'Showing All History'}
          </button>
          <button
            onClick={loadAlerts}
            className="p-2 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 text-stone-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                alt.severity === 'critical'
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : alt.severity === 'warning'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-sky-50/70 border-sky-200 text-sky-950'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getSeverityIcon(alt.severity)}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-white/80 border border-current">
                      {alt.alert_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      {alt.created_at ? new Date(alt.created_at).toLocaleString('en-IN') : ''}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{alt.message}</p>
                </div>
              </div>

              {alt.is_active ? (
                <button
                  onClick={() => handleResolve(alt.id)}
                  className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl text-xs font-bold text-stone-700 shadow-2xs whitespace-nowrap"
                >
                  Acknowledge
                </button>
              ) : (
                <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Resolved
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-sage space-y-3">
            <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-heading font-bold text-stone-900 text-base">
              All Systems Healthy & Clear
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No active hardware alerts. Soil moisture, ambient temperature, reservoir level, and pump safeguards are nominal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
