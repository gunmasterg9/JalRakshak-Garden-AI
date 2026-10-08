import React, { createContext, useContext, useState, useEffect } from 'react';
import { HealthStatus } from '../types';
import { fetchHealth, fetchSettings } from '../api';
import { Language, translations } from '../i18n';

interface GardenContextType {
  health: HealthStatus | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshHealth: () => Promise<void>;
  t: typeof translations['en'];
  isGujaratMode: boolean;
  setGujaratMode: (val: boolean) => void;
}

const GardenContext = createContext<GardenContextType | null>(null);

export const GardenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [isGujaratMode, setGujaratMode] = useState<boolean>(true);

  const refreshHealth = async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch {
      setHealth({
        ok: false,
        app: 'JalRakshak Garden AI',
        version: '1.0.0',
        privacy: 'local-first',
        storage: 'local SQLite',
        ollama_available: false,
        model: 'offline',
        model_installed: false,
        installed_models: [],
      });
    }
  };

  useEffect(() => {
    refreshHealth();
    fetchSettings()
      .then((res) => {
        if (res?.settings?.language) {
          setLanguageState(res.settings.language as Language);
        }
        if (res?.settings?.region === 'gujarat') {
          setGujaratMode(true);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = translations[language] || translations.en;

  return (
    <GardenContext.Provider
      value={{
        health,
        language,
        setLanguage,
        refreshHealth,
        t,
        isGujaratMode,
        setGujaratMode,
      }}
    >
      {children}
    </GardenContext.Provider>
  );
};

export const useGarden = () => {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGarden must be used within GardenProvider');
  return ctx;
};
