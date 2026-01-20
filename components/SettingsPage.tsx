
import React, { useState } from 'react';
import { AppSettings, Language } from '../types.ts';

interface SettingsPageProps {
  settings: AppSettings;
  language: Language;
  onSave: (settings: AppSettings) => void;
  translations: any;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, language, onSave, translations: t }) => {
  const [editedSettings, setEditedSettings] = useState<AppSettings>(settings);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const handleSave = () => {
    onSave(editedSettings);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const updateOpenAI = (key: string, value: string) => {
    setEditedSettings(prev => ({
      ...prev,
      openai: {
        baseUrl: prev.openai?.baseUrl || '',
        apiKey: prev.openai?.apiKey || '',
        model: prev.openai?.model || '',
        [key]: value
      }
    }));
  };

  const updateGeneral = (key: keyof AppSettings, value: any) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t.apiSettings}</h2>
          <p className="text-slate-500 text-sm">Configure your AI extraction engine and parameters.</p>
        </div>
        <button 
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {t.saveSettings}
        </button>
      </div>

      {showSavedMsg && (
        <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {t.settingsSaved}
        </div>
      )}

      {/* General Settings Section */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-800 text-lg border-b pb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          {t.generalSettings}
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.systemPrompt}</label>
            <textarea 
              value={editedSettings.systemPrompt}
              onChange={(e) => updateGeneral('systemPrompt', e.target.value)}
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition font-mono text-sm"
              placeholder="Enter system prompt for the AI..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.temperature}</label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{editedSettings.temperature}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={editedSettings.temperature}
              onChange={(e) => updateGeneral('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => setEditedSettings(p => ({ ...p, provider: 'gemini' }))}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${editedSettings.provider === 'gemini' ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        >
          <div className="flex items-center gap-3 mb-4">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${editedSettings.provider === 'gemini' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 12.1"/><path d="M12 12v10"/><path d="M12 12l7.1 7.1"/><path d="M12 12l7.1-7.1"/><path d="M12 12l-7.1 7.1"/><path d="M12 12l-7.1-7.1"/></svg>
             </div>
             <h3 className="font-bold text-slate-800 text-lg">Google Gemini</h3>
          </div>
          <p className="text-sm text-slate-500">{t.geminiDescription}</p>
        </div>

        <div 
          onClick={() => setEditedSettings(p => ({ ...p, provider: 'openai' }))}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${editedSettings.provider === 'openai' ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        >
          <div className="flex items-center gap-3 mb-4">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${editedSettings.provider === 'openai' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
             </div>
             <h3 className="font-bold text-slate-800 text-lg">OpenAI Compatible</h3>
          </div>
          <p className="text-sm text-slate-500">{t.openaiDescription}</p>
        </div>
      </div>

      {editedSettings.provider === 'openai' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.baseUrl}</label>
              <input 
                type="text" 
                placeholder="https://api.openai.com/v1"
                value={editedSettings.openai?.baseUrl || ''}
                onChange={(e) => updateOpenAI('baseUrl', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.apiKey}</label>
              <input 
                type="password" 
                placeholder="sk-..."
                value={editedSettings.openai?.apiKey || ''}
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
              value={editedSettings.openai?.model || ''}
              onChange={(e) => updateOpenAI('model', e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;