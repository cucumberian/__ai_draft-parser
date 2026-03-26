
import React, { useState, useCallback, useRef } from 'react';
import { FileStatus, Template, Language } from '../types.ts';

interface DrawingCardProps {
  fileStatus: FileStatus;
  activeTemplate: Template;
  language: Language;
  onProcess: (id: string) => void;
  onRemove: (id: string) => void;
  onPreview: (fileStatus: FileStatus) => void;
  onUpdateResult?: (id: string, result: any) => void;
  onToggleVerification?: (id: string) => void;
  onRotate?: (id: string, degrees: number) => void;
  translations: any;
}

const DrawingCard: React.FC<DrawingCardProps> = ({
  fileStatus,
  activeTemplate,
  language,
  onProcess,
  onRemove,
  onPreview,
  onUpdateResult,
  onToggleVerification,
  onRotate,
  translations: t,
}) => {
  const [localResult, setLocalResult] = useState<any>(fileStatus.result || {});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update localResult when fileStatus.result changes (e.g., after extraction)
  React.useEffect(() => {
    if (fileStatus.result) {
      setLocalResult(fileStatus.result);
    }
  }, [fileStatus.result]);

  const saveChanges = useCallback((newResult: any) => {
    if (onUpdateResult) {
      onUpdateResult(fileStatus.id, newResult);
    }
  }, [fileStatus.id, onUpdateResult]);

  const handleValueChange = (key: string, value: any) => {
    const newResult = { ...localResult, [key]: value };
    setLocalResult(newResult);
    
    // Debounce save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveChanges(newResult);
    }, 500);
  };

  const handleArrayChange = (key: string, index: number, value: string) => {
    const newArray = [...(localResult[key] || [])];
    newArray[index] = value;
    const newResult = { ...localResult, [key]: newArray };
    setLocalResult(newResult);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveChanges(newResult);
    }, 500);
  };

  const handleArrayRemove = (key: string, index: number) => {
    const newArray = [...(localResult[key] || [])];
    newArray.splice(index, 1);
    const newResult = { ...localResult, [key]: newArray };
    setLocalResult(newResult);
    saveChanges(newResult);
  };

  const handleArrayAdd = (key: string) => {
    const field = activeTemplate.fields.find(f => f.key === key);
    const newValue = field?.type === 'ARRAY_NUMBER' ? 0 : '';
    const newArray = [...(localResult[key] || []), newValue];
    const newResult = { ...localResult, [key]: newArray };
    setLocalResult(newResult);
    saveChanges(newResult);
  };

  const handleCopy = () => {
    if (fileStatus.result) {
      const json = JSON.stringify(fileStatus.result, null, 2);
      navigator.clipboard.writeText(json);
    }
  };

  const hasPreview = !!fileStatus.previewUrl;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row transition hover:shadow-md lg:h-[500px] xl:h-[600px]">
      {/* Drawing Preview Area */}
      <div className="w-full lg:w-[45%] xl:w-[40%] bg-slate-50 flex flex-col items-center justify-center p-4 border-b lg:border-b-0 lg:border-r border-slate-200 relative shrink-0 h-[220px] sm:h-[280px] lg:h-full">
        {hasPreview ? (
          <div className="relative group w-full h-full flex items-center justify-center overflow-hidden rounded bg-white border border-slate-100 shadow-sm cursor-pointer" onClick={() => onPreview(fileStatus)}>
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img
                src={fileStatus.previewUrl}
                alt={fileStatus.file.name}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `rotate(${fileStatus.rotation}deg)` }}
              />
            </div>
            <div className="absolute bottom-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition z-10">
              <button
                onClick={(e) => { e.stopPropagation(); onRotate?.(fileStatus.id, (fileStatus.rotation - 90 + 360) % 360); }}
                className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition"
                title={language === 'ru' ? 'Повернуть влево' : 'Rotate left'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRotate?.(fileStatus.id, (fileStatus.rotation + 90) % 360); }}
                className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition"
                title={language === 'ru' ? 'Повернуть вправо' : 'Rotate right'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </button>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(fileStatus.id); }} 
              className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition shadow-lg hover:bg-red-600 z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="absolute bottom-2 right-2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </div>
          </div>
        ) : fileStatus.imageMissing ? (
          <div className="relative group w-full h-full flex items-center justify-center overflow-hidden rounded bg-amber-50 border-2 border-dashed border-amber-200">
            <button 
              onClick={() => onRemove(fileStatus.id)} 
              className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition shadow-lg hover:bg-red-600 z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="flex flex-col items-center gap-3 text-amber-500 p-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <span className="text-xs font-bold text-amber-700 block">{language === 'ru' ? 'Изображение не загружено' : 'Image not loaded'}</span>
                <span className="text-[10px] text-amber-500 mt-1 block truncate max-w-[200px]">{fileStatus.file.name}</span>
              </div>
              <span className="text-[10px] text-amber-400">{language === 'ru' ? 'Перетащите файл для заполнения' : 'Drop file to fill'}</span>
            </div>
          </div>
        ) : (
          <div className="relative group w-full h-full flex items-center justify-center overflow-hidden rounded bg-white border border-slate-100 shadow-sm">
            <button 
              onClick={() => onRemove(fileStatus.id)} 
              className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition shadow-lg hover:bg-red-600 z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="flex flex-col items-center gap-2 text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-xs font-medium text-slate-400">{fileStatus.file.name}</span>
              <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden min-h-0">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 sm:gap-0">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <h4 className="font-bold text-slate-800 text-lg truncate pr-4">{fileStatus.file.name}</h4>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{(fileStatus.file.size / 1024).toFixed(1)} KB</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${fileStatus.status === 'completed' ? 'bg-green-100 text-green-700' : fileStatus.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse' : fileStatus.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                {fileStatus.status === 'pending' ? t.pending : fileStatus.status === 'processing' ? t.working : fileStatus.status === 'completed' ? t.yes : t.extractionFailed}
              </span>
              {onToggleVerification && (
                <button
                  onClick={() => onToggleVerification(fileStatus.id)}
                  className={`transition flex items-center gap-1.5 px-1.5 py-0.5 rounded ${fileStatus.verified ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50' : 'text-slate-400 hover:text-slate-500'}`}
                  title={fileStatus.verified ? t.verified : t.notVerified}
                >
                  {fileStatus.verified ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="0.5">
                      <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/>
                      <polyline points="9 12.5 11 14.5 15.5 9.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/>
                    </svg>
                  )}
                  <span className="text-[10px] font-bold uppercase">{fileStatus.verified ? t.verified : t.notVerified}</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => onProcess(fileStatus.id)} 
              disabled={fileStatus.status === 'processing'} 
              className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-50 transition uppercase tracking-wider flex items-center gap-2"
            >
              {fileStatus.status === 'processing' ? (
                <><svg className="animate-spin h-3 w-3 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>{t.working}</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>{fileStatus.status === 'completed' ? t.rerun : t.process}</>
              )}
            </button>
            {fileStatus.status === 'completed' && (
              <button 
                onClick={handleCopy} 
                className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition uppercase tracking-wider flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>{t.copyResult}
              </button>
            )}
          </div>
        </div>

        {/* Data Grid / Status Area - Always Editable */}
        <div className="flex-1 overflow-auto bg-slate-50/50 rounded-xl border border-slate-100 p-4 sm:p-6 custom-scrollbar min-h-[200px]">
          {fileStatus.status === 'processing' ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[160px]">
              <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-600">{t.extractingData}</p>
                <p className="text-xs text-slate-400 mt-1">{t.analyzingShapes}</p>
              </div>
            </div>
          ) : (
            <>
              {fileStatus.status === 'error' && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-xs font-medium">{fileStatus.error}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {activeTemplate.fields.map(field => {
                  const value = localResult[field.key];
                  return (
                    <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{field.label}</span>
                      <div className="text-sm font-semibold text-slate-700 break-words">
                        {field.type === 'BOOLEAN' ? (
                          <select
                            value={String(value ?? false)}
                            onChange={(e) => handleValueChange(field.key, e.target.value === 'true')}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="true">{t.yes}</option>
                            <option value="false">{t.no}</option>
                          </select>
                        ) : field.type === 'ARRAY_STRING' || field.type === 'ARRAY_NUMBER' ? (
                          <div className="space-y-1">
                            {(Array.isArray(value) ? value : []).map((v: any, i: number) => (
                              <div key={i} className="flex items-center gap-1">
                                <input
                                  type={field.type === 'ARRAY_NUMBER' ? 'number' : 'text'}
                                  value={v}
                                  onChange={(e) => handleArrayChange(field.key, i, e.target.value)}
                                  className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                  onClick={() => handleArrayRemove(field.key, i)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => handleArrayAdd(field.key)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                              {language === 'ru' ? 'Добавить' : 'Add'}
                            </button>
                          </div>
                        ) : field.type === 'NUMBER' ? (
                          <input
                            type="number"
                            value={value ?? ''}
                            onChange={(e) => handleValueChange(field.key, e.target.value === '' ? null : Number(e.target.value))}
                            placeholder={t.notFound}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={value ?? ''}
                            onChange={(e) => handleValueChange(field.key, e.target.value)}
                            placeholder={t.notFound}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingCard;
