import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileStatus, Template, Language, ExtractionField } from '../types.ts';

interface FullscreenPreviewProps {
  files: FileStatus[];
  currentIndex: number;
  activeTemplate: Template;
  language: Language;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onUpdateResult: (id: string, result: any) => void;
  translations: any;
}

function FieldInput({ field, value, onChange, language, t }: {
  field: ExtractionField;
  value: any;
  onChange: (val: any) => void;
  language: Language;
  t: any;
}) {
  const inputBase = "bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 w-full";

  if (field.type === 'BOOLEAN') {
    return (
      <select
        value={String(value ?? false)}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
        style={{ minWidth: 60 }}
      >
        <option value="true" className="bg-slate-800">{t.yes}</option>
        <option value="false" className="bg-slate-800">{t.no}</option>
      </select>
    );
  }

  if (field.type === 'ARRAY_STRING' || field.type === 'ARRAY_NUMBER') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-col gap-1">
        {arr.map((v: any, i: number) => (
          <div key={i} className="flex items-center gap-1">
            <input
              type={field.type === 'ARRAY_NUMBER' ? 'number' : 'text'}
              value={v}
              onChange={(e) => {
                const newArr = [...arr];
                newArr[i] = field.type === 'ARRAY_NUMBER' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                onChange(newArr);
              }}
              className={inputBase}
              style={{ minWidth: 50 }}
            />
            <button
              onClick={() => { const n = [...arr]; n.splice(i, 1); onChange(n); }}
              className="p-0.5 text-red-400 hover:text-red-300 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...arr, field.type === 'ARRAY_NUMBER' ? 0 : ''])}
          className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-0.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          {language === 'ru' ? 'Добавить' : 'Add'}
        </button>
      </div>
    );
  }

  if (field.type === 'NUMBER') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder={t.notFound}
        className={inputBase}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t.notFound}
      className={inputBase}
    />
  );
}

const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({
  files,
  currentIndex,
  activeTemplate,
  language,
  onClose,
  onNavigate,
  onUpdateResult,
  translations: t,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const file = files[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const [localResult, setLocalResult] = useState<any>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalResult(file?.result || {});
  }, [file?.id, file?.result]);

  const saveChanges = useCallback((newResult: any) => {
    if (file) onUpdateResult(file.id, newResult);
  }, [file, onUpdateResult]);

  const handleValueChange = useCallback((key: string, value: any) => {
    setLocalResult((prev: any) => {
      const newResult = { ...prev, [key]: value };
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => saveChanges(newResult), 500);
      return newResult;
    });
  }, [saveChanges]);

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      if (e.deltaY > 0 || e.deltaX > 0) goNext();
      else if (e.deltaY < 0 || e.deltaX < 0) goPrev();
    };
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [goPrev, goNext]);

  if (!file) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      {/* Position indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm font-medium">
        {currentIndex + 1} / {files.length}
      </div>

      {/* Editable fields panel */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] w-auto max-h-[50vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="bg-black/60 backdrop-blur-md rounded-xl px-5 py-3 text-white">
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10">
            <p className="text-sm font-medium truncate max-w-[400px]">{file.file.name}</p>
            <span className="text-xs text-white/50 shrink-0">{(file.file.size / 1024).toFixed(1)} KB</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${file.status === 'completed' ? 'bg-green-500/30 text-green-300' : file.status === 'processing' ? 'bg-blue-500/30 text-blue-300' : file.status === 'error' ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-white/50'}`}>
              {file.status === 'pending' ? t.pending : file.status === 'processing' ? t.working : file.status === 'completed' ? t.yes : t.extractionFailed}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2.5">
            {activeTemplate.fields.map(field => (
              <div key={field.id} className="min-w-0">
                <label className="text-[9px] text-white/40 uppercase font-bold block mb-1 truncate">{field.label}</label>
                <FieldInput
                  field={field}
                  value={localResult[field.key]}
                  onChange={(val) => handleValueChange(field.key, val)}
                  language={language}
                  t={t}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Left arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition"
          title={language === 'ru' ? 'Предыдущий файл' : 'Previous file'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}

      {/* Right arrow */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition"
          title={language === 'ru' ? 'Следующий файл' : 'Next file'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* Image */}
      <img
        src={file.previewUrl}
        alt={file.file.name}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default FullscreenPreview;
