import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Globe,
  SunMedium,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Server,
  Lock,
  Radio,
} from 'lucide-react';
import { fetchSettings, updateSettings } from '../api';
import { AppSettings } from '../types';
import { useGarden } from '../context/GardenContext';
import { Language } from '../i18n';

export const Settings: React.FC = () => {
  const { t, refreshHealth, setLanguage } = useGarden();
  const [settingsData, setSettingsData] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemma4:12b');
  const [customModel, setCustomModel] = useState<string>('');
  const [lang, setLang] = useState<Language>('en');
  const [region, setRegion] = useState<string>('gujarat');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettingsData(data);
      if (data.settings?.ollama_model) {
        setSelectedModel(data.settings.ollama_model);
      } else if (data.ollama?.model) {
        setSelectedModel(data.ollama.model);
      }
      if (data.settings?.language) {
        setLang(data.settings.language as Language);
      }
      if (data.settings?.region) {
        setRegion(data.settings.region);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    const modelToSave = customModel.trim() || selectedModel;
    try {
      const updated = await updateSettings({
        ollama_model: modelToSave,
        language: lang,
        region: region,
      });
      setSettingsData(updated);
      setLanguage(lang);
      await refreshHealth();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-stone-900">
            {t.settings}
          </h1>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Configure local AI parameters, regional gardening climate mode, and localization.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Local AI Model Selection */}
        <div className="garden-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sage">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-nature-700" />
              <h2 className="text-base font-bold font-heading text-stone-900">
                Local AI Model (Ollama)
              </h2>
            </div>
            {settingsData?.ollama?.ollama_available ? (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ollama Active
              </span>
            ) : (
              <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Offline Mode
              </span>
            )}
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            JalRakshak connects directly to your local Ollama instance (
            <code className="bg-cream-200 px-1 py-0.5 rounded text-stone-800">
              http://127.0.0.1:11434
            </code>
            ). No prompts or images are ever uploaded to external cloud servers.
          </p>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-stone-700 block">
              Choose Preferred Open-Weight Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {settingsData?.suggested_models?.map((m: any) => (
                <label
                  key={m.name}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                    selectedModel === m.name
                      ? 'border-nature-600 bg-nature-50'
                      : 'border-sage bg-cream-50 hover:bg-cream-100'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-stone-900 block font-heading">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-stone-500">{m.type}</span>
                  </div>
                  <input
                    type="radio"
                    name="model"
                    value={m.name}
                    checked={selectedModel === m.name}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      setCustomModel('');
                    }}
                    className="accent-nature-700"
                  />
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Or Specify Any Other Installed Model
              </label>
              <input
                type="text"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  setSelectedModel(e.target.value);
                }}
                placeholder="e.g. mistral:latest or custom fine-tune"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              />
            </div>

            <div className="p-3 rounded-xl bg-cream-100 text-[11px] text-stone-600 border border-sage">
              <strong>Notice:</strong> We do not download models in the background without your explicit command.
              Ensure you pull your desired model in terminal (e.g.{' '}
              <code>ollama pull gemma4:12b</code>).
            </div>
          </div>
        </div>

        {/* Regional & Localization */}
        <div className="garden-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-sage">
            <Globe className="w-5 h-5 text-nature-700" />
            <h2 className="text-base font-bold font-heading text-stone-900">
              Regional Climate & Language
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Display Language
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="en">English</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Gardening Mode
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="gujarat">Gujarat Arid & Semi-Arid Heat Guard</option>
                <option value="standard">Standard Temperate Gardening</option>
              </select>
            </div>
          </div>
        </div>

        {/* IoT Hardware Configuration UI (Section 35) */}
        <div className="garden-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-sage">
            <Radio className="w-5 h-5 text-nature-700" />
            <h2 className="text-base font-bold font-heading text-stone-900">
              IoT Hardware & Actuator Settings
            </h2>
          </div>

          <p className="text-xs text-stone-600">
            Configure ESP32 controller parameters, physical pump safety limits, and communication endpoints.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Primary Device ID
              </label>
              <input
                type="text"
                defaultValue="esp32-garden-01"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                ESP32 Local Network IP
              </label>
              <input
                type="text"
                defaultValue="192.168.1.150"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Operation Mode
              </label>
              <select
                defaultValue="AI_RECOMMEND"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="MONITOR_ONLY">MONITOR_ONLY (Sensors Only)</option>
                <option value="AI_RECOMMEND">AI_RECOMMEND (Default Advisory)</option>
                <option value="SEMI_AUTOMATIC">SEMI_AUTOMATIC (Confirm Prompts)</option>
                <option value="AUTOMATIC">AUTOMATIC (Safety-Gated Rules)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Max Pump Runtime (Seconds)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                defaultValue="60"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Min Tank Level Cutoff (%)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                defaultValue="15"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Optional MQTT Broker
              </label>
              <input
                type="text"
                placeholder="192.168.1.100:1883"
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Local-First Architecture Information */}
        <div className="garden-card p-6 space-y-3 bg-nature-50/50 border-nature-200">
          <div className="flex items-center gap-2 text-nature-900 font-bold text-sm">
            <Lock className="w-4 h-4 text-nature-700" />
            <span>Open Innovation & Local Privacy Architecture</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            JalRakshak was built around open-weight models to ensure food-growing knowledge remains
            accessible anywhere — including rural farms, remote gardens, and offline setups with zero cloud fees.
            Your plant health notes, photos, and watering logs stay on your local disk in SQLite.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs font-bold py-2.5 px-6"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
