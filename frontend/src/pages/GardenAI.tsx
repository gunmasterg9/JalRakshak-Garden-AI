import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Languages,
  CheckCircle2,
  HelpCircle,
  Droplets,
  Thermometer,
  Gauge,
  Info,
} from 'lucide-react';
import { sendGardenChat, fetchIoTRecommendation, fetchSupportedPlants } from '../api';
import { IoTRecommendation } from '../types';
import { useGarden } from '../context/GardenContext';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  source?: string;
  evidence?: any;
  timestamp: string;
}

export const GardenAI: React.FC = () => {
  const { language } = useGarden();
  const [query, setQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('Tomato');
  const [supportedPlants, setSupportedPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<IoTRecommendation | null>(null);
  const [chatLang, setChatLang] = useState<'en' | 'gu' | 'hi'>(language as any || 'en');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Namaste! I am your JalRakshak Garden AI. I reason using your real ESP32 sensors, local climate knowledge, and plant science. How can I help your garden flourish today?',
      source: 'offline rules + ollama',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    fetchSupportedPlants()
      .then((data) => setSupportedPlants(data))
      .catch(() => {});
    loadRecommendation(selectedPlant);
  }, [selectedPlant]);

  const loadRecommendation = async (plant: string) => {
    try {
      const rec = await fetchIoTRecommendation('esp32-garden-01', plant);
      setRecommendation(rec);
    } catch (err) {
      console.error('Failed to load recommendation:', err);
    }
  };

  const handleSend = async (customQuery?: string) => {
    const textToSend = customQuery || query;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await sendGardenChat(textToSend, 'esp32-garden-01', selectedPlant, chatLang);
      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: res.reply,
        source: res.source,
        evidence: res.evidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'I could not connect to Ollama right now, but your sensor rules are active. Check soil 3-5 cm beneath the mulch before irrigating.',
          source: 'deterministic fallback',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    { label: '💧 Should I water today?', text: `Should I water my ${selectedPlant} today based on the current sensors?` },
    { label: '🇬🇺 Tamara tomato plant ma pani ketlu aapvu?', text: `મારા ${selectedPlant} ના છોડને કેટલું પાણી આપવું?` },
    { label: '🇮🇳 मिट्टी बहुत dry है, pump चालू करूं?', text: `मिट्टी की नमी कम लग रही है, क्या मुझे पंप चालू करना चाहिए?` },
    { label: '🌿 Heat stress check', text: `Is the current terrace temperature causing heat stress for my ${selectedPlant}?` },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sage">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-nature-700" />
            <h1 className="text-2xl font-heading font-extrabold text-stone-900 tracking-tight">
              Garden AI & Sensor Reasoning
            </h1>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Open-weight AI grounded in live ESP32 sensors, soil drying physics, and regional botany.
          </p>
        </div>

        {/* Plant and Language Selectors */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="text-xs font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:ring-2 focus:ring-nature-500 outline-none shadow-sm"
          >
            {supportedPlants.map((p) => (
              <option key={p.id} value={p.canonical_name}>
                🌱 {p.canonical_name} ({p.name_gu})
              </option>
            ))}
            {supportedPlants.length === 0 && <option value="Tomato">🌱 Tomato (ટામેટું)</option>}
          </select>

          <select
            value={chatLang}
            onChange={(e) => setChatLang(e.target.value as any)}
            className="text-xs font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:ring-2 focus:ring-nature-500 outline-none shadow-sm"
          >
            <option value="en">English</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>
      </div>

      {/* Sensor-Grounded Explainability Banner */}
      {recommendation && (
        <div className="bg-white rounded-2xl border border-sage p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  recommendation.recommendation === 'WATER_NOW'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : recommendation.recommendation === 'DO_NOT_WATER'
                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                Recommendation: {recommendation.recommendation.replace('_', ' ')}
              </span>
              <span className="text-xs font-semibold text-stone-500">
                Confidence: {recommendation.confidence}%
              </span>
            </div>
            <span className="text-xs font-mono bg-stone-100 px-2.5 py-0.5 rounded-md text-stone-600">
              Source: {recommendation.source}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Why */}
            <div className="space-y-1">
              <span className="font-bold text-stone-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-nature-600" /> Why?
              </span>
              <p className="text-stone-600 leading-relaxed">{recommendation.why}</p>
            </div>

            {/* Evidence */}
            <div className="space-y-1">
              <span className="font-bold text-stone-700 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-nature-600" /> Evidence
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-700 font-mono">
                  Soil: {recommendation.evidence.soil_moisture}
                </span>
                <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-700 font-mono">
                  Temp: {recommendation.evidence.temperature}
                </span>
                <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-700 font-mono">
                  Tank: {recommendation.evidence.water_level}
                </span>
                <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-700 font-mono">
                  Trend: {recommendation.evidence.drying_drop}
                </span>
              </div>
            </div>

            {/* Action */}
            <div className="space-y-1">
              <span className="font-bold text-stone-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-nature-600" /> Practical Action
              </span>
              <p className="text-stone-600 leading-relaxed">{recommendation.action}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="bg-white rounded-2xl border border-sage shadow-sm flex flex-col h-[520px]">
        {/* Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-nature-700 text-white'
                    : 'bg-cream-200 text-nature-900 border border-sage'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-nature-700 text-white rounded-tr-none'
                    : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>
                {m.evidence && (
                  <div className="mt-2 pt-2 border-t border-stone-200/60 flex flex-wrap gap-2 text-[11px] text-stone-500 font-mono">
                    <span>🌱 {m.evidence.plant}</span>
                    <span>💧 Soil {m.evidence.soil_moisture}</span>
                    <span>🌡 {m.evidence.temperature}</span>
                  </div>
                )}
                <div
                  className={`mt-1 text-[10px] text-right ${
                    m.sender === 'user' ? 'text-nature-200' : 'text-stone-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-stone-500 text-xs font-medium">
              <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-nature-700 animate-spin" />
              </div>
              <span>JalRakshak AI is reasoning with your sensor readings...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="px-5 py-2.5 bg-stone-50/70 border-t border-stone-100 flex items-center gap-2 overflow-x-auto">
          {samplePrompts.map((sp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sp.text)}
              disabled={loading}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-stone-200 hover:border-nature-400 hover:bg-cream-50 text-stone-700 rounded-lg whitespace-nowrap transition-all shadow-2xs"
            >
              {sp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-sage flex items-center gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask about ${selectedPlant} watering, soil moisture, or wilt symptoms...`}
            className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-nature-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
            className="p-2.5 bg-nature-700 hover:bg-nature-800 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
