import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { translations } from '../i18n';
import { GardenProvider } from '../context/GardenContext';
import { Header } from '../components/Header';

// Mock API functions for component test
vi.mock('../api', () => ({
  fetchHealth: vi.fn().mockResolvedValue({
    ok: true,
    app: 'JalRakshak Garden AI',
    version: '1.0.0',
    storage: 'local SQLite',
    ollama_available: true,
    model: 'gemma4:12b',
    model_installed: true,
    installed_models: ['gemma4:12b'],
  }),
  fetchSettings: vi.fn().mockResolvedValue({
    settings: { language: 'en', region: 'gujarat', ollama_model: 'gemma4:12b' },
    ollama: { ollama_available: true, model: 'gemma4:12b' },
  }),
}));

describe('i18n Localization', () => {
  it('supports English, Gujarati, and Hindi translations', () => {
    expect(translations.en.appName).toBe('JalRakshak Garden AI');
    expect(translations.gu.appName).toBe('જળરક્ષક ગાર્ડન એઆઈ');
    expect(translations.hi.appName).toBe('जलक्षक गार्डन एआई');

    // Key labels must be present across all languages
    for (const lang of ['en', 'gu', 'hi'] as const) {
      expect(translations[lang].dashboard).toBeTruthy();
      expect(translations[lang].myGarden).toBeTruthy();
      expect(translations[lang].plantDoctor).toBeTruthy();
      expect(translations[lang].waterPlanner).toBeTruthy();
      expect(translations[lang].gardenJournal).toBeTruthy();
      expect(translations[lang].missions).toBeTruthy();
    }
  });
});

describe('Header Component', () => {
  it('renders app logo, branding, and language switcher buttons', async () => {
    await React.act(async () => {
      render(
        <GardenProvider>
          <Header onToggleSidebar={() => {}} />
        </GardenProvider>
      );
    });

    expect(screen.getByText('JalRakshak Garden AI')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('ગુજ')).toBeInTheDocument();
    expect(screen.getByText('हिं')).toBeInTheDocument();
  });
});
