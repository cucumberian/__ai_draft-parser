
import React from 'react';
import { AppSettings, Language } from '../types.ts';

interface SettingsPageProps {
  settings: AppSettings;
  language: Language;
  onSave: (settings: AppSettings) => void;
  translations: any;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, language, onSave, translations: t }) => {
  const updateOpenAI = (key: string, value: string) => {
    onSave({
      ...settings,
      openai: {
        baseUrl: settings.openai?.baseUrl || '',
        apiKey: settings.openai?.apiKey || '',
        model: settings.openai?.model || '',
        [key]: value
      }
    });
  };

  const updateGeneral = (key: keyof AppSettings, value: any) => {
    onSave({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t.apiSettings}</h2>
        <p className="text-slate-500 text-sm">Configure your AI extraction engine and parameters.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-800 text-lg border-b pb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          {t.generalSettings}
        </h3>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.systemPrompt}</label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => updateGeneral('systemPrompt', e.target.value)}
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition font-mono text-sm"
              placeholder="Enter system prompt for the AI..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.temperature}</label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => updateGeneral('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-800 text-lg border-b pb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
          OpenAI Compatible
        </h3>
        <p className="text-sm text-slate-500">{t.openaiDescription}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.baseUrl}</label>
            <input
              type="text"
              placeholder="https://api.openai.com/v1"
              value={settings.openai?.baseUrl || ''}
              onChange={(e) => updateOpenAI('baseUrl', e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.apiKey}</label>
            <input
              type="password"
              placeholder="sk-..."
              value={settings.openai?.apiKey || ''}
              onChange={(e) => updateOpenAI('apiKey', e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.modelName}</label>
          <input
            type="text"
            placeholder="gpt-4o / llama-3-vision..."
            value={settings.openai?.model || ''}
            onChange={(e) => updateOpenAI('model', e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
