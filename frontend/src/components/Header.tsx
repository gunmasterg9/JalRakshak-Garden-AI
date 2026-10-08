import React from 'react';
import {
  Sprout,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Globe,
  Menu,
  SunMedium,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useGarden } from '../context/GardenContext';
import { Language } from '../i18n';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { health, refreshHealth, language, setLanguage, t, isGujaratMode } = useGarden();

  const getStatusBadge = () => {
    if (!health) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {t.aiStatusChecking}
        </span>
      );
    }
    if (health.ollama_available) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{health.model}</span>
          <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">AI Live</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span>{t.aiStatusOffline}</span>
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-sage flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-nature-700 text-white flex items-center justify-center shadow-sm shadow-nature-700/20">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-base text-stone-900 tracking-tight leading-tight">
                {t.appName}
              </span>
              {isGujaratMode && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                  <SunMedium className="w-3 h-3 text-amber-600" /> Gujarat Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 font-medium hidden sm:block leading-none">
              {t.tagline}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Local AI status */}
        <div className="hidden sm:flex items-center">{getStatusBadge()}</div>

        {/* Refresh probe */}
        <button
          onClick={refreshHealth}
          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
          title="Refresh AI Connection"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Language selector */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
          <Globe className="w-3.5 h-3.5 text-stone-500 ml-1" />
          {(['en', 'gu', 'hi'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                language === lang
                  ? 'bg-white text-nature-800 shadow-sm font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {lang === 'en' ? 'EN' : lang === 'gu' ? 'ગુજ' : 'हिं'}
            </button>
          ))}
        </div>

        {/* Privacy badge */}
        <div className="hidden md:flex items-center gap-1 text-xs text-nature-700 bg-nature-100/60 px-2.5 py-1 rounded-full border border-nature-200 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-nature-600" />
          <span>Local Only</span>
        </div>
      </div>
    </header>
  );
};
