
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, FileStatus, Template, View, Language, AppSettings } from './types';
import { DEFAULT_TEMPLATE, TRANSLATIONS, DEFAULT_SYSTEM_PROMPT } from './constants';
import { extractData } from './services/extractionService';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import SettingsPage from './components/SettingsPage';
import Header from './components/Header';
import DrawingCard from './components/DrawingCard';

const STORAGE_KEY = 'blueprint_insight_state';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          files: [], 
          currentView: 'dashboard',
          currentLanguage: parsed.currentLanguage || 'ru',
          settings: {
            provider: 'gemini',
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            temperature: 0.1,
            ...parsed.settings
          }
        };
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
    return {
      templates: [DEFAULT_TEMPLATE],
      activeTemplateId: DEFAULT_TEMPLATE.id,
      files: [],
      currentView: 'dashboard',
      currentLanguage: 'ru',
      settings: { 
        provider: 'gemini',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        temperature: 0.1
      }
    };
  });

  const [isEditingTemplate, setIsEditingTemplate] = useState<Template | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lang = state.currentLanguage;
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const { files, currentView, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state.templates, state.activeTemplateId, state.currentLanguage, state.settings]);

  const activeTemplate = useMemo(() => 
    state.templates.find(t => t.id === state.activeTemplateId) || state.templates[0] || DEFAULT_TEMPLATE
  , [state.templates, state.activeTemplateId]);

  const toggleLanguage = () => {
    setState(p => ({ ...p, currentLanguage: p.currentLanguage === 'ru' ? 'en' : 'ru' }));
  };

  const calculateHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleFiles = async (filesList: FileList | null) => {
    if (!filesList) return;
    
    const newFiles: FileStatus[] = [];
    for (const file of Array.from(filesList)) {
      const sha256 = await calculateHash(file);
      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        sha256
      });
    }

    setState(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setState(prev => {
      const file = prev.files.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.previewUrl);
      return { ...prev, files: prev.files.filter(f => f.id !== id) };
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const processFile = async (id: string) => {
    const fileStatus = state.files.find(f => f.id === id);
    if (!fileStatus) return;

    updateFileStatus(id, { status: 'processing', error: undefined });

    try {
      const base64 = await fileToBase64(fileStatus.file);
      const result = await extractData(base64, activeTemplate.fields, fileStatus.file.type, state.settings);
      updateFileStatus(id, { status: 'completed', result });
    } catch (err: any) {
      console.error(err);
      updateFileStatus(id, { status: 'error', error: err.message || 'Processing failed' });
    }
  };

  const processAll = async () => {
    setGlobalLoading(true);
    const hasPending = state.files.some(f => f.status === 'pending' || f.status === 'error');
    const toProcess = state.files.filter(f => {
      if (f.status === 'processing') return false;
      if (hasPending) return f.status === 'pending' || f.status === 'error';
      return true;
    });

    for (const f of toProcess) {
      await processFile(f.id);
    }
    setGlobalLoading(false);
  };

  const updateFileStatus = (id: string, updates: Partial<FileStatus>) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const saveEditedTemplate = (template: Template) => {
    setState(prev => {
      const exists = prev.templates.find(t => t.id === template.id);
      if (exists) {
        return {
          ...prev,
          templates: prev.templates.map(t => t.id === template.id ? template : t)
        };
      } else {
        return {
          ...prev,
          templates: [...prev.templates, template]
        };
      }
    });
    setIsEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    if (state.templates.length <= 1) return;
    setState(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== id),
      activeTemplateId: prev.activeTemplateId === id ? prev.templates.find(t => t.id !== id)!.id : prev.activeTemplateId
    }));
  };

  const createNewTemplate = () => {
    const newTemplate: Template = {
      id: Math.random().toString(36).substr(2, 9),
      name: lang === 'ru' ? 'Новый шаблон' : 'New Custom Template',
      fields: []
    };
    setIsEditingTemplate(newTemplate);
  };

  const downloadResultsAsJson = () => {
    const results = state.files
      .filter(f => f.status === 'completed')
      .map(f => ({
        fileName: f.file.name,
        sha256: f.sha256,
        extractedData: f.result
      }));

    if (results.length === 0) return;

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction_results_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadResultsAsCsv = () => {
    const completedFiles = state.files.filter(f => f.status === 'completed');
    if (completedFiles.length === 0) return;

    const headers = ['File Name', 'SHA256', ...activeTemplate.fields.map(f => f.label)];
    
    const escape = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = '';
      if (Array.isArray(val)) {
        str = val.join(', ');
      } else {
        str = val.toString();
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = completedFiles.map(f => {
      const rowData = [
        escape(f.file.name),
        escape(f.sha256),
        ...activeTemplate.fields.map(field => escape(f.result?.[field.key]))
      ];
      return rowData.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction_results_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateSettings = (settings: AppSettings) => {
    setState(prev => ({ ...prev, settings }));
  };

  const allCompleted = state.files.length > 0 && state.files.every(f => f.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        currentView={state.currentView}
        onViewChange={(view) => setState(p => ({ ...p, currentView: view }))}
        currentLanguage={state.currentLanguage}
        onLanguageToggle={toggleLanguage}
        templates={state.templates}
        activeTemplateId={state.activeTemplateId}
        onTemplateChange={(id) => setState(p => ({ ...p, activeTemplateId: id }))}
      />

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col">
        {state.currentView === 'dashboard' ? (
          <div className="flex-1 flex flex-col space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 gap-4 sticky top-[60px] md:top-[70px] z-30 shadow-md">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-bold uppercase tracking-wider">
                  {state.files.length} {t.files}
                </div>
                <div className="hidden sm:flex text-xs text-slate-400 font-medium items-center gap-2">
                  {t.activePattern}: 
                  <select 
                    value={state.activeTemplateId}
                    onChange={(e) => setState(p => ({ ...p, activeTemplateId: e.target.value }))}
                    className="bg-slate-50 border-none rounded px-2 py-0.5 text-slate-600 font-bold focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {state.templates.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-200 transition text-sm">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                   {lang === 'ru' ? 'Добавить' : 'Add'}
                </button>
                <button 
                  onClick={processAll}
                  disabled={globalLoading || state.files.length === 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 transition shadow-sm text-sm"
                >
                  {globalLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  )}
                  {globalLoading ? t.processingBatch : (allCompleted ? t.rerunAll : t.startExtraction)}
                </button>
                <div className="flex gap-1">
                  <button onClick={downloadResultsAsJson} disabled={!state.files.some(f => f.status === 'completed')} className="px-4 py-2 bg-slate-800 text-white rounded-l-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-900 disabled:bg-slate-300 transition shadow-sm text-sm border-r border-slate-700" title={t.exportBatch}>
                    JSON
                  </button>
                  <button onClick={downloadResultsAsCsv} disabled={!state.files.some(f => f.status === 'completed')} className="px-4 py-2 bg-slate-800 text-white rounded-r-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-900 disabled:bg-slate-300 transition shadow-sm text-sm" title={t.exportBatchCsv}>
                    CSV
                  </button>
                </div>
              </div>
            </div>

            {/* List or Empty State */}
            <div 
              className={`flex-1 relative min-h-[400px] flex flex-col transition-all duration-300 ${isDragging ? 'bg-blue-50/20' : ''}`}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            >
              {state.files.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {state.files.map(fileStatus => (
                    <DrawingCard 
                      key={fileStatus.id}
                      fileStatus={fileStatus}
                      activeTemplate={activeTemplate}
                      language={state.currentLanguage}
                      onProcess={processFile}
                      onRemove={removeFile}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-2xl bg-white border border-slate-100 shadow-sm" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner transition group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">{t.noDrawings}</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mt-4">
                    {lang === 'ru' ? 'Используйте кнопку "Добавить" или перетащите файлы в это окно' : 'Use the "Add" button or drag files into this window'}.
                    <br />
                    <span className="text-sm text-slate-400 font-medium mt-2 block">{activeTemplate.name}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : state.currentView === 'templates' ? (
          <TemplateManager templates={state.templates} activeTemplateId={state.activeTemplateId} language={lang} onSelect={(id) => setState(p => ({ ...p, activeTemplateId: id, currentView: 'dashboard' }))} onEdit={(t) => setIsEditingTemplate(t)} onDelete={deleteTemplate} onImport={(t) => setState(p => ({ ...p, templates: [...p.templates, t] }))} onCreate={createNewTemplate} />
        ) : (
          <SettingsPage settings={state.settings} language={lang} onSave={updateSettings} />
        )}
      </main>

      {isEditingTemplate && (<TemplateEditor template={isEditingTemplate} language={lang} onSave={saveEditedTemplate} onClose={() => setIsEditingTemplate(null)} />)}

      <footer className="py-4 bg-slate-900 text-slate-400 border-t border-slate-800 text-center text-[11px]">
        <p>© {new Date().getFullYear()} BluePrint Insight - Advanced Engineering Intelligence Tool</p>
      </footer>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }`}</style>
    </div>
  );
};

export default App;
