
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, FileStatus, Template, View, Language, AppSettings } from './types';
import { DEFAULT_TEMPLATE, TRANSLATIONS, DEFAULT_SYSTEM_PROMPT } from './constants';
import { extractData } from './services/extractionService';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import SettingsPage from './components/SettingsPage';

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
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setState(p => ({ ...p, currentView: 'dashboard' }))}>
            <div className="p-2 bg-blue-600 rounded-lg shadow-blue-900/20 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h1"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BluePrint Insight</h1>
              <p className="text-xs text-slate-400">AI Drawing Extraction</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={() => setState(p => ({ ...p, currentView: 'dashboard' }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${state.currentView === 'dashboard' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
            >
              {t.dashboard}
            </button>
            <button 
              onClick={() => setState(p => ({ ...p, currentView: 'templates' }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${state.currentView === 'templates' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
            >
              {t.templates}
            </button>
            <button 
              onClick={() => setState(p => ({ ...p, currentView: 'settings' }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${state.currentView === 'settings' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
            >
              {t.settings}
            </button>
          </nav>

          <div className="flex items-center gap-4 pl-4 md:border-l border-slate-700">
             <button 
               onClick={toggleLanguage}
               className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all duration-200 group"
               aria-label="Toggle Language"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-blue-400 transition-colors">
                 <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
               </svg>
               <span className="text-[11px] font-bold tracking-wider text-slate-300 group-hover:text-white uppercase">
                 {state.currentLanguage}
               </span>
             </button>
             <div className="hidden lg:flex flex-col items-end">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.activePattern}</div>
                <select 
                  value={state.activeTemplateId}
                  onChange={(e) => setState(p => ({ ...p, activeTemplateId: e.target.value }))}
                  className="bg-transparent text-sm font-medium text-blue-400 focus:outline-none cursor-pointer hover:text-blue-300 transition-colors"
                >
                  {state.templates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id} className="bg-slate-900 text-white">
                      {tmpl.name}
                    </option>
                  ))}
                </select>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col">
        {state.currentView === 'dashboard' ? (
          <div className="flex-1 flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 gap-4 sticky top-[80px] z-30 shadow-md">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-bold uppercase tracking-wider">
                  {state.files.length} {t.files}
                </div>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    JSON
                  </button>
                  <button onClick={downloadResultsAsCsv} disabled={!state.files.some(f => f.status === 'completed')} className="px-4 py-2 bg-slate-800 text-white rounded-r-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-900 disabled:bg-slate-300 transition shadow-sm text-sm" title={t.exportBatchCsv}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    CSV (Excel)
                  </button>
                </div>
              </div>
            </div>

            <div 
              className={`flex-1 relative min-h-[400px] flex flex-col gap-6 rounded-2xl border-4 border-dashed transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-transparent'}`}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            >
              {state.files.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {state.files.map(fileStatus => (
                    <div key={fileStatus.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row h-full max-h-[600px] transition hover:shadow-md">
                      <div className="lg:w-1/4 bg-slate-50 flex items-center justify-center p-4 border-r border-slate-200 relative">
                        <div className="relative group w-full h-full flex items-center justify-center overflow-hidden rounded bg-white border border-slate-100 shadow-sm min-h-[160px]">
                          {fileStatus.file.type === 'application/pdf' ? (
                            <div className="flex flex-col items-center gap-4 text-slate-400 p-8">
                               <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                               <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.pdfDocument}</span>
                               <a href={fileStatus.previewUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold hover:bg-blue-100 transition">{t.viewFullPdf}</a>
                            </div>
                          ) : (
                            <img src={fileStatus.previewUrl} alt={fileStatus.file.name} className="max-w-full max-h-full object-contain" />
                          )}
                          <button onClick={() => removeFile(fileStatus.id)} className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-red-600 z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>

                      <div className="lg:w-3/4 flex flex-col p-6 overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-lg truncate pr-4">{fileStatus.file.name}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                               <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{(fileStatus.file.size / 1024).toFixed(1)} KB</span>
                               {fileStatus.sha256 && (
                                 <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono truncate max-w-[200px]" title={fileStatus.sha256}>
                                   SHA256: {fileStatus.sha256}
                                 </span>
                               )}
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${fileStatus.status === 'completed' ? 'bg-green-100 text-green-700' : fileStatus.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse' : fileStatus.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                 {fileStatus.status === 'pending' ? t.pending : fileStatus.status === 'processing' ? t.working : fileStatus.status === 'completed' ? t.yes : t.extractionFailed}
                               </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => processFile(fileStatus.id)} disabled={fileStatus.status === 'processing'} className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-50 transition uppercase tracking-wider flex items-center gap-2">
                              {fileStatus.status === 'processing' ? (
                                <><svg className="animate-spin h-3 w-3 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>{t.working}</>
                              ) : (
                                <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>{fileStatus.status === 'completed' ? t.rerun : t.process}</>
                              )}
                            </button>
                            {fileStatus.status === 'completed' && (
                              <button onClick={() => { const json = JSON.stringify(fileStatus.result, null, 2); navigator.clipboard.writeText(json); }} className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition uppercase tracking-wider flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>{t.copyResult}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50/50 rounded-xl border border-slate-100 p-6 custom-scrollbar">
                          {fileStatus.status === 'completed' && fileStatus.result ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {activeTemplate.fields.map(field => {
                                const value = fileStatus.result[field.key];
                                return (
                                  <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{field.label}</span>
                                    <div className="text-sm font-semibold text-slate-700 break-words">
                                      {value === null || value === undefined ? (<span className="text-slate-300 italic">{t.notFound}</span>) : Array.isArray(value) ? (
                                        value.length > 0 ? (<div className="flex flex-wrap gap-1">{value.map((v, i) => (<span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">{v}</span>))}</div>) : <span className="text-slate-300 italic">{t.notFound}</span>
                                      ) : typeof value === 'boolean' ? (<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{value ? t.yes : t.no}</span>) : value.toString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : fileStatus.status === 'processing' ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                              <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                              <div className="text-center"><p className="text-sm font-bold text-slate-600">{t.extractingData}</p><p className="text-xs text-slate-400 mt-1">{t.analyzingShapes}</p></div>
                            </div>
                          ) : fileStatus.status === 'error' ? (
                            <div className="h-full flex flex-col items-center justify-center text-red-500 bg-red-50/50 rounded-lg p-6">
                              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <p className="text-sm font-bold uppercase tracking-widest">{t.extractionFailed}</p><p className="text-xs mt-2 text-center max-w-xs">{fileStatus.error}</p>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                              <p className="text-sm italic">{t.uploadFilesPrompt} <b>{activeTemplate.name}</b></p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isDragging && (<div className="bg-blue-600/10 border-2 border-blue-500 border-dashed rounded-xl p-8 flex items-center justify-center animate-pulse"><span className="text-blue-600 font-bold">{lang === 'ru' ? 'Бросайте сюда для добавления' : 'Drop to add more files'}</span></div>)}
                </div>
              ) : (
                <div className={`flex-1 flex flex-col items-center justify-center text-center p-12 rounded-2xl border-4 border-dashed border-slate-200 transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'bg-white'}`} onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">{t.noDrawings}</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mt-4">{t.uploadFilesPrompt} <b>{activeTemplate.name}</b>.<br /><span className="text-sm text-slate-400">{lang === 'ru' ? 'Перетащите файлы сюда или нажмите для выбора' : 'Drag & Drop files here or click to browse'}</span></p>
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

      <footer className="p-8 bg-slate-900 text-slate-400 border-t border-slate-800 text-center text-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-6 opacity-60 grayscale hover:grayscale-0 transition">
             <span className="font-bold tracking-widest text-white uppercase">{state.settings.provider} ENGINE</span>
             <span className="font-bold tracking-widest text-white">VISION AI</span>
          </div>
          <p>© {new Date().getFullYear()} BluePrint Insight - Advanced Engineering Intelligence Tool</p>
        </div>
      </footer>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }`}</style>
    </div>
  );
};

export default App;
