import React, { useState, useEffect, useCallback } from 'react';
import { View, Template, Language, FileStatus } from './types';
import { DEFAULT_TEMPLATE, DEFAULT_SYSTEM_PROMPT, DEFAULT_SETTINGS } from './constants';

import { useFiles } from './src/hooks/useFiles';
import { useTemplates } from './src/hooks/useTemplates';
import { useSettings } from './src/hooks/useSettings';
import { useTranslation } from './src/hooks/useTranslation';
import { exportToJson, exportToCsv } from './src/utils/export';

import { extractData } from './services/extractionService';
import { isPdfFile, pdfToImageBase64 } from './services/pdfService';
import { isTifFile, tifToImageBase64 } from './services/tifService';
import { IMAGE_SIZE_OPTIONS } from './services/imageOptimizer';

import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import SettingsPage from './components/SettingsPage';
import Header from './components/Header';
import DrawingCard from './components/DrawingCard';
import FullscreenPreview from './components/FullscreenPreview';
import ConfirmModal from './components/ConfirmModal';

const STORAGE_KEY = 'blueprint_insight_state';

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

const App: React.FC = () => {
  const saved = loadSavedState();

  const { templates, activeTemplateId, activeTemplate, updateTemplate, deleteTemplate, selectTemplate, addTemplate } = 
    useTemplates(saved?.templates, saved?.activeTemplateId);

  const { settings, updateSettings, updateOpenAIConfig, setImageMaxSize } = useSettings({
    ...DEFAULT_SETTINGS,
    ...saved?.settings
  });

  const { language, t, toggleLanguage, setLanguage } = useTranslation(saved?.currentLanguage || 'ru');
  const { files, fileInputRef, addFiles, removeFile, updateFileStatus, clearFiles } = useFiles();

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isEditingTemplate, setIsEditingTemplate] = useState<Template | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      templates,
      activeTemplateId,
      currentLanguage: language,
      settings
    }));
  }, [templates, activeTemplateId, language, settings]);

  const handleFiles = useCallback(async (filesList: FileList | null) => {
    await addFiles(filesList, settings.imageMaxSize);
  }, [addFiles, settings.imageMaxSize]);

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

  const processFile = async (id: string, signal?: AbortSignal) => {
    const fileStatus = files.find(f => f.id === id);
    if (!fileStatus) return;

    updateFileStatus(id, { status: 'processing', error: undefined });

    try {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      let base64: string;
      let mimeType: string;

      if (isPdfFile(fileStatus.file)) {
        base64 = fileStatus.imageForModel || await pdfToImageBase64(fileStatus.file, 2);
        mimeType = 'image/png';
      } else if (isTifFile(fileStatus.file)) {
        base64 = fileStatus.imageForModel || (await tifToImageBase64(fileStatus.file)).base64;
        mimeType = 'image/png';
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(fileStatus.file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        base64 = dataUrl.split(',')[1];
        mimeType = fileStatus.file.type;
      }

      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const result = await extractData(base64, activeTemplate.fields, mimeType, settings, signal);
      updateFileStatus(id, { status: 'completed', result });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updateFileStatus(id, { status: 'pending' });
      } else {
        console.error(err);
        updateFileStatus(id, { status: 'error', error: err.message || 'Processing failed' });
      }
    }
  };

  const processAll = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsProcessing(true);

    const toProcess = files.filter(f => f.status !== 'processing');

    for (const f of toProcess) {
      if (controller.signal.aborted) break;
      await processFile(f.id, controller.signal);
    }

    setIsProcessing(false);
    abortControllerRef.current = null;
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
      files.filter(f => f.status === 'processing').forEach(f => {
        updateFileStatus(f.id, { status: 'pending' });
      });
    }
  };

  const handleSaveTemplate = (template: Template) => {
    if (templates.some(t => t.id === template.id)) {
      updateTemplate(template);
    } else {
      addTemplate(template);
    }
    setIsEditingTemplate(null);
  };

  const handleImportTemplate = (template: Template) => {
    template.id = Math.random().toString(36).substr(2, 9);
    addTemplate(template);
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: Math.random().toString(36).substr(2, 9),
      name: language === 'ru' ? 'Новый шаблон' : 'New Custom Template',
      fields: []
    };
    setIsEditingTemplate(newTemplate);
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        currentView={currentView}
        onViewChange={setCurrentView}
        currentLanguage={language}
        onLanguageToggle={toggleLanguage}
        translations={t}
      />

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col">
        {currentView === 'dashboard' ? (
          <div className="flex-1 flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 gap-4 sticky top-[60px] md:top-[70px] z-30 shadow-md">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-bold uppercase tracking-wider">
                  {files.length} {t.files}
                </div>
                <div className="hidden sm:flex text-xs text-slate-400 font-medium items-center gap-2">
                  {t.activePattern}: 
                  <select 
                    value={activeTemplateId}
                    onChange={(e) => selectTemplate(e.target.value)}
                    className="bg-slate-50 border-none rounded px-2 py-0.5 text-slate-600 font-bold focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {templates.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                    ))}
                  </select>
                </div>
                <div className="hidden sm:flex text-xs text-slate-400 font-medium items-center gap-2">
                  {t.imageSize}:
                  <select
                    value={settings.imageMaxSize ?? ''}
                    onChange={(e) => setImageMaxSize(e.target.value ? Number(e.target.value) : null)}
                    className="bg-slate-50 border-none rounded px-2 py-0.5 text-slate-600 font-bold focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {IMAGE_SIZE_OPTIONS.map(size => (
                      <option key={String(size)} value={size ?? ''}>{size ? `${size}px` : t.original}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,image/*" />
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-200 transition text-sm">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                   <span className="hidden sm:inline">{language === 'ru' ? 'Добавить' : 'Add'}</span>
                </button>
                <button 
                  onClick={isProcessing ? cancelProcessing : processAll}
                  disabled={!isProcessing && files.length === 0}
                  className={`px-5 py-2 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-sm text-sm ${isProcessing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300'}`}
                >
                  {isProcessing ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  )}
                  {isProcessing ? t.cancelExtraction : (allCompleted ? t.rerunAll : t.startExtraction)}
                </button>
                {files.some(f => f.status === 'completed') && (
                  <>
                    <button 
                      onClick={() => exportToJson(files)}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold flex items-center gap-2 hover:bg-green-200 transition text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      JSON
                    </button>
                    <button 
                      onClick={() => exportToCsv(files)}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 transition text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      CSV
                    </button>
                  </>
                )}
                {files.length > 0 && (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    title={t.clearAll}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            </div>

            <div 
              className={`flex-1 relative min-h-[400px] flex flex-col transition-all duration-300 ${isDragging ? 'bg-blue-50/20' : ''}`}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            >
              {files.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {files.map((fileStatus, idx) => (
                    <DrawingCard 
                      key={fileStatus.id}
                      fileStatus={fileStatus}
                      activeTemplate={activeTemplate}
                      language={language}
                      onProcess={processFile}
                      onRemove={removeFile}
                      onPreview={() => setPreviewIndex(idx)}
                      onUpdateResult={(id, result) => updateFileStatus(id, { result })}
                      translations={t}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-2xl bg-white border border-slate-100 shadow-sm cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">{t.noDrawings}</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mt-4">
                    {language === 'ru' ? 'Используйте кнопку "Добавить" или перетащите файлы в это окно' : 'Use the "Add" button or drag files into this window'}.
                    <br />
                    <span className="text-sm text-slate-400 font-medium mt-2 block">{activeTemplate.name}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'templates' ? (
          <TemplateManager 
            templates={templates} 
            activeTemplateId={activeTemplateId} 
            language={language} 
            onSelect={(id) => { selectTemplate(id); setCurrentView('dashboard'); }} 
            onEdit={setIsEditingTemplate} 
            onDelete={deleteTemplate} 
            onImport={handleImportTemplate} 
            onCreate={handleCreateTemplate}
            translations={t}
          />
        ) : (
          <SettingsPage 
            settings={settings} 
            language={language} 
            onSave={updateSettings} 
            translations={t}
          />
        )}
      </main>

      {isEditingTemplate && (
        <TemplateEditor 
          template={isEditingTemplate} 
          language={language} 
          onSave={handleSaveTemplate} 
          onClose={() => setIsEditingTemplate(null)} 
          translations={t}
        />
      )}

      {previewIndex !== null && files[previewIndex] && (
        <FullscreenPreview
          files={files}
          currentIndex={previewIndex}
          activeTemplate={activeTemplate}
          language={language}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
          onUpdateResult={(id, result) => updateFileStatus(id, { result })}
          translations={t}
        />
      )}

      {confirmClearAll && (
        <ConfirmModal
          title={language === 'ru' ? 'Удалить все чертежи?' : 'Remove all drawings?'}
          message={language === 'ru' ? 'Все загруженные чертежи и извлечённые данные будут удалены.' : 'All uploaded drawings and extracted data will be removed.'}
          confirmLabel={language === 'ru' ? 'Удалить' : 'Remove'}
          cancelLabel={language === 'ru' ? 'Отмена' : 'Cancel'}
          onConfirm={() => { clearFiles(); setConfirmClearAll(false); }}
          onCancel={() => setConfirmClearAll(false)}
        />
      )}

      <footer className="py-4 bg-slate-900 text-slate-400 border-t border-slate-800 text-center text-[11px]">
        <p>© {new Date().getFullYear()} BluePrint Insight - Advanced Engineering Intelligence Tool</p>
      </footer>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }`}</style>
    </div>
  );
};

export default App;
