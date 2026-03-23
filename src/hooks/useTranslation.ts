import { useState, useMemo, useCallback } from 'react';
import { Language } from '../../types';
import { TRANSLATIONS } from '../../constants';

export function useTranslation(initialLanguage: Language = 'ru') {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  const t = useMemo(() => {
    return Object.keys(TRANSLATIONS).reduce((acc, key) => {
      acc[key] = TRANSLATIONS[key][language] || key;
      return acc;
    }, {} as Record<string, string>);
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'ru' ? 'en' : 'ru');
  }, []);

  return {
    language,
    t,
    setLanguage,
    toggleLanguage
  };
}
