
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, FileStatus, Template, View, Language, AppSettings, ExtractionField, FieldType, AIProvider } from './types.ts';
import { DEFAULT_TEMPLATE, TRANSLATIONS, DEFAULT_SYSTEM_PROMPT } from './constants.ts';

// --- SERVICE LOGIC ---
async function performExtraction(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  settings: AppSettings
) {
  if (settings.provider === 'openai' && settings.openai) {
    return extractFromOpenAI(fileDataBase64, fields, mimeType, settings.openai, settings.systemPrompt, settings.temperature);
  }
  return extractFromGemini(fileDataBase64, fields, mimeType, settings.systemPrompt, settings.temperature);
}

async function extractFromGemini(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  systemPrompt: string,
  temperature: number
) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please check your environment.");

  const ai = new GoogleGenAI({ apiKey });
  const properties: Record<string, any> = {};
  const required: string[] = [];

  fields.forEach(field => {
    required.push(field.key);
    switch (field.type) {
      case FieldType.STRING: properties[field.key] = { type: Type.STRING, description: field.description }; break;
      case FieldType.NUMBER: properties[field.key] = { type: Type.NUMBER, description: field.description }; break;
      case FieldType.BOOLEAN: properties[field.key] = { type: Type.BOOLEAN, description: field.description }; break;
      case FieldType.ARRAY_STRING: properties[field.key] = { type: Type.ARRAY, items: { type: Type.STRING }, description: field.description }; break;
      case FieldType.ARRAY_NUMBER: properties[field.key] = { type: Type.ARRAY, items: { type: Type.NUMBER }, description: field.description }; break;
    }
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: fileDataBase64.split(',')[1] || fileDataBase64 } },
        { text: systemPrompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.OBJECT, properties, required },
      temperature: temperature,
    },
  });

  return JSON.parse(response.text || '{}');
}

async function extractFromOpenAI(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  config: { baseUrl: string; apiKey: string; model: string },
  systemPrompt: string,
  temperature: number
) {
  let url = config.baseUrl.trim();
  if (!url.endsWith('/chat/completions')) {
    url = `${url.replace(/\/+$/, '')}/chat/completions`;
  }
  const base64Data = fileDataBase64.includes(',') ? fileDataBase64 : `data:${mimeType};base64,${fileDataBase64}`;
  const schema: Record<string, any> = {};
  fields.forEach(f => { schema[f.key] = f.description; });

  const prompt = `${systemPrompt}\nRequired JSON keys: ${JSON.stringify(schema)}\nReturn ONLY valid JSON.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: base64Data } }] }],
      response_format: { type: 'json_object' },
      temperature: temperature
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.choices[0]?.message?.content || '{}');
}

// --- COMPONENTS ---

const Header: React.FC<{
  currentView: View, 
  onViewChange: (v: View) => void, 
  currentLanguage: Language, 
  onLanguageToggle: () => void,
  templates: Template[],
  activeTemplateId: string,
  onTemplateChange: (id: string) => void,
  translations: any
}> = ({ currentView, onViewChange, currentLanguage, onLanguageToggle, templates, activeTemplateId, onTemplateChange, translations: t }) => (
  <header className="bg-slate-900 text-white py-2 px-4 shadow-lg sticky top-0 z-40">
    <div className="container mx-auto flex justify-between items-center gap-2">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('dashboard')}>
        <div className="p-1.5 bg-blue-600 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div className="hidden md:block"><h1 className="text-base font-bold">BluePrint Insight</h1></div>
      </div>
      <nav className="flex gap-1">
        {(['dashboard', 'templates', 'settings'] as View[]).map(v => (
          <button key={v} onClick={() => onViewChange(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${currentView === v ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>{t[v]}</button>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <button onClick={onLanguageToggle} className="text-[10px] font-bold uppercase text-slate-300 hover:text-white px-2 py-1 bg-slate-800 rounded">{currentLanguage}</button>
      </div>
    </div>
  </header>
);

const DrawingCard: React.FC<{
  fileStatus: FileStatus, 
  activeTemplate: Template, 
  onProcess: (id: string) => void, 
  onRemove: (id: string) => void,
  translations: any
}> = ({ fileStatus, activeTemplate, onProcess, onRemove, translations: t }) => {
  const isPending = fileStatus.status === 'pending';
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row transition ${isPending ? '' : 'lg:h-[500px]'}`}>
      <div className={`w-full lg:w-1/4 bg-slate-50 flex items-center justify-center p-4 border-r border-slate-200 relative shrink-0 ${isPending ? 'h-32 lg:h-auto' : 'h-64 lg:h-full'}`}>
        <img src={fileStatus.previewUrl} className="max-w-full max-h-full object-contain" />
        <button onClick={() => onRemove(fileStatus.id)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div className="flex-1 flex flex-col p-6 min-h-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-bold text-slate-800">{fileStatus.file.name}</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${fileStatus.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>{t[fileStatus.status] || fileStatus.status}</span>
          </div>
          <button onClick={() => onProcess(fileStatus.id)} disabled={fileStatus.status === 'processing'} className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase">{fileStatus.status === 'completed' ? t.rerun : t.process}</button>
        </div>
        <div className={`flex-1 overflow-auto bg-slate-50 rounded-lg p-4 ${isPending ? 'min-h-[60px]' : 'min-h-[120px]'}`}>
          {fileStatus.status === 'completed' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTemplate.fields.map(f => (
                <div key={f.id} className="bg-white p-2 border rounded shadow-sm">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">{f.label}</span>
                  <div className="text-sm font-semibold">{String(fileStatus.result?.[f.key] || t.notFound)}</div>
                </div>
              ))}
            </div>
          ) : fileStatus.status === 'processing' ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400"><div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div><span className="text-xs">{t.working}</span></div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg><span className="text-sm">{t.pending}</span></div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- APP CORE ---

// Fixed: Defining STORAGE_KEY to enable local state persistence
const STORAGE_KEY = 'blueprint_insight_state_v1';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, files: [], currentView: 'dashboard', currentLanguage: parsed.currentLanguage || 'ru', settings: { provider: 'gemini', systemPrompt: DEFAULT_SYSTEM_PROMPT, temperature: 0.1, ...parsed.settings }};
      } catch (e) { console.error(e); }
    }
    return { templates: [DEFAULT_TEMPLATE], activeTemplateId: DEFAULT_TEMPLATE.id, files: [], currentView: 'dashboard', currentLanguage: 'ru', settings: { provider: 'gemini', systemPrompt: DEFAULT_SYSTEM_PROMPT, temperature: 0.1 } };
  });

  const [globalLoading, setGlobalLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = state.currentLanguage;
  const t = useMemo(() => Object.keys(TRANSLATIONS).reduce((acc, key) => { acc[key] = TRANSLATIONS[key][lang] || key; return acc; }, {} as any), [lang]);

  useEffect(() => {
    const { files, currentView, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state.templates, state.activeTemplateId, state.currentLanguage, state.settings]);

  const activeTemplate = useMemo(() => state.templates.find(t => t.id === state.activeTemplateId) || state.templates[0], [state.templates, state.activeTemplateId]);

  const handleFiles = async (filesList: FileList | null) => {
    if (!filesList) return;
    const newFiles: FileStatus[] = Array.from(filesList).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file, previewUrl: URL.createObjectURL(file), status: 'pending'
    }));
    setState(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const processFile = async (id: string) => {
    const fileStatus = state.files.find(f => f.id === id);
    if (!fileStatus) return;
    setState(prev => ({ ...prev, files: prev.files.map(f => f.id === id ? { ...f, status: 'processing', error: undefined } : f) }));
    try {
      const base64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(fileStatus.file); });
      const result = await performExtraction(base64, activeTemplate.fields, fileStatus.file.type, state.settings);
      setState(prev => ({ ...prev, files: prev.files.map(f => f.id === id ? { ...f, status: 'completed', result } : f) }));
    } catch (err: any) {
      setState(prev => ({ ...prev, files: prev.files.map(f => f.id === id ? { ...f, status: 'error', error: err.message } : f) }));
    }
  };

  const processAll = async () => {
    setGlobalLoading(true);
    const toProcess = state.files.filter(f => f.status !== 'processing');
    for (const f of toProcess) { await processFile(f.id); }
    setGlobalLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      <Header 
        currentView={state.currentView} onViewChange={(v) => setState(p => ({ ...p, currentView: v }))}
        currentLanguage={state.currentLanguage} onLanguageToggle={() => setState(p => ({ ...p, currentLanguage: p.currentLanguage === 'ru' ? 'en' : 'ru' }))}
        templates={state.templates} activeTemplateId={state.activeTemplateId} onTemplateChange={(id) => setState(p => ({ ...p, activeTemplateId: id }))}
        translations={t}
      />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {state.currentView === 'dashboard' ? (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.activePattern}: <span className="text-blue-600">{activeTemplate.name}</span></div>
              <div className="flex gap-2">
                <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold uppercase">{lang === 'ru' ? 'Добавить' : 'Add'}</button>
                <button onClick={processAll} disabled={globalLoading || state.files.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase disabled:bg-slate-300 shadow-lg shadow-blue-200">{globalLoading ? t.processingBatch : t.startExtraction}</button>
              </div>
            </div>

            {state.files.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {state.files.map(f => (
                  <DrawingCard key={f.id} fileStatus={f} activeTemplate={activeTemplate} translations={t} onProcess={processFile} onRemove={(id) => setState(p => ({ ...p, files: p.files.filter(x => x.id !== id) }))} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-blue-400 transition" onClick={() => fileInputRef.current?.click()}>
                <div className="text-4xl mb-4">📄</div>
                <h3 className="font-bold text-xl">{t.noDrawings}</h3>
                <p className="text-slate-400 text-sm mt-2">{lang === 'ru' ? 'Нажмите, чтобы загрузить файлы' : 'Click to upload files'}</p>
              </div>
            )}
          </div>
        ) : state.currentView === 'settings' ? (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">{t.apiSettings}</h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">{t.systemPrompt}</label>
                <textarea value={state.settings.systemPrompt} onChange={(e) => setState(p => ({ ...p, settings: { ...p.settings, systemPrompt: e.target.value } }))} className="p-3 border rounded-xl h-32 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">{t.temperature}</label>
                <input type="range" min="0" max="1" step="0.1" value={state.settings.temperature} onChange={(e) => setState(p => ({ ...p, settings: { ...p.settings, temperature: parseFloat(e.target.value) } }))} className="w-full" />
                <div className="text-right text-xs font-bold text-blue-600">{state.settings.temperature}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">Section coming soon...</div>
        )}
      </main>

      <footer className="py-4 text-center text-[10px] text-slate-400 uppercase tracking-widest border-t border-slate-100">
        BluePrint Insight © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
