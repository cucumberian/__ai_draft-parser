import { useState, useCallback } from 'react';
import { AppSettings, OpenAIConfig } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';

export function useSettings(initialSettings: Partial<AppSettings> = {}) {
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  });

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateOpenAIConfig = useCallback((updates: Partial<OpenAIConfig>) => {
    setSettings(prev => ({
      ...prev,
      openai: { ...prev.openai, ...updates }
    }));
  }, []);

  const setImageMaxSize = useCallback((size: number | null) => {
    setSettings(prev => ({ ...prev, imageMaxSize: size }));
  }, []);

  const setTemperature = useCallback((temp: number) => {
    setSettings(prev => ({ ...prev, temperature: temp }));
  }, []);

  return {
    settings,
    updateSettings,
    updateOpenAIConfig,
    setImageMaxSize,
    setTemperature
  };
}
