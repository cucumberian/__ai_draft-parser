import React from 'react';
import { FileStatus, Template, ExtractionField, Language } from '../types.ts';

interface FieldInputProps {
  field: ExtractionField;
  value: any;
  onChange: (val: any) => void;
  language: Language;
  t: any;
}

function FieldInput({ field, value, onChange, language, t }: FieldInputProps) {
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

interface FullscreenTopPanelProps {
  file: FileStatus;
  currentIndex: number;
  filesCount: number;
  activeTemplate: Template;
  language: Language;
  localResult: Record<string, any>;
  onValueChange: (key: string, value: any) => void;
  onToggleVerification?: (id: string) => void;
  t: any;
  filesRef: React.MutableRefObject<FileStatus[]>;
  indexRef: React.MutableRefObject<number>;
  toggleRef: React.MutableRefObject<((id: string) => void) | undefined>;
}

const FullscreenTopPanel: React.FC<FullscreenTopPanelProps> = ({
  file,
  currentIndex,
  filesCount,
  activeTemplate,
  language,
  localResult,
  onValueChange,
  onToggleVerification,
  t,
  filesRef,
  indexRef,
  toggleRef,
}) => {
  return (
    <>
      {/* Position indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <div className="px-4 py-1.5 bg-black/50 rounded-full text-white text-sm font-medium">
          {currentIndex + 1} / {filesCount}
        </div>
        {onToggleVerification && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const f = filesRef.current[indexRef.current];
              if (f && toggleRef.current) toggleRef.current(f.id);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
              file.verified
                ? 'bg-emerald-500/90 text-white hover:bg-emerald-500'
                : 'bg-white/30 text-white/60 hover:bg-white/40'
            }`}
            title={language === 'ru' ? 'Пробел/Enter — верифицировать' : 'Space/Enter — verify'}
          >
            {file.verified ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="0.5">
                <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/>
                <polyline points="9 12.5 11 14.5 15.5 9.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/>
              </svg>
            )}
            {file.verified ? t.verified : t.notVerified}
          </button>
        )}
      </div>

      {/* Editable fields panel */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] w-auto max-h-[50vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="bg-black/50 rounded-xl px-5 py-3 text-white">
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
                  onChange={(val) => onValueChange(field.key, val)}
                  language={language}
                  t={t}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default FullscreenTopPanel;
