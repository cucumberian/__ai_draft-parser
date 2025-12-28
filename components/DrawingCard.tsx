
import React from 'react';
import { FileStatus, Template, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface DrawingCardProps {
  fileStatus: FileStatus;
  activeTemplate: Template;
  language: Language;
  onProcess: (id: string) => void;
  onRemove: (id: string) => void;
}

const DrawingCard: React.FC<DrawingCardProps> = ({
  fileStatus,
  activeTemplate,
  language,
  onProcess,
  onRemove,
}) => {
  const t = TRANSLATIONS[language];

  const handleCopy = () => {
    if (fileStatus.result) {
      const json = JSON.stringify(fileStatus.result, null, 2);
      navigator.clipboard.writeText(json);
    }
  };

  const isPending = fileStatus.status === 'pending';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row transition hover:shadow-md ${isPending ? 'lg:h-auto' : 'lg:h-[500px] xl:h-[600px]'}`}>
      {/* Drawing Preview Area */}
      <div className={`w-full lg:w-1/3 xl:w-1/4 bg-slate-50 flex flex-col items-center justify-center p-4 border-b lg:border-b-0 lg:border-r border-slate-200 relative shrink-0 ${isPending ? 'h-[160px] lg:h-auto' : 'h-[220px] sm:h-[280px] lg:h-full'}`}>
        <div className="relative group w-full h-full flex items-center justify-center overflow-hidden rounded bg-white border border-slate-100 shadow-sm">
          {fileStatus.file.type === 'application/pdf' ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.pdfDocument}</span>
              <a href={fileStatus.previewUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold hover:bg-blue-100 transition">{t.viewFullPdf}</a>
            </div>
          ) : (
            <img src={fileStatus.previewUrl} alt={fileStatus.file.name} className="max-w-full max-h-full object-contain" />
          )}
          <button 
            onClick={() => onRemove(fileStatus.id)} 
            className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition shadow-lg hover:bg-red-600 z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
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

        {/* Data Grid / Status Area */}
        <div className={`flex-1 overflow-auto bg-slate-50/50 rounded-xl border border-slate-100 p-4 sm:p-6 custom-scrollbar ${isPending ? 'min-h-[80px]' : 'min-h-[200px]'}`}>
          {fileStatus.status === 'completed' && fileStatus.result ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {activeTemplate.fields.map(field => {
                const value = fileStatus.result[field.key];
                return (
                  <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{field.label}</span>
                    <div className="text-sm font-semibold text-slate-700 break-words">
                      {value === null || value === undefined ? (
                        <span className="text-slate-300 italic">{t.notFound}</span>
                      ) : Array.isArray(value) ? (
                        value.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {value.map((v, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">{v}</span>
                            ))}
                          </div>
                        ) : <span className="text-slate-300 italic">{t.notFound}</span>
                      ) : typeof value === 'boolean' ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {value ? t.yes : t.no}
                        </span>
                      ) : value.toString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : fileStatus.status === 'processing' ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[160px]">
              <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-600">{t.extractingData}</p>
                <p className="text-xs text-slate-400 mt-1">{t.analyzingShapes}</p>
              </div>
            </div>
          ) : fileStatus.status === 'error' ? (
            <div className="h-full flex flex-col items-center justify-center text-red-500 bg-red-50/50 rounded-lg p-6 min-h-[160px]">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-sm font-bold uppercase tracking-widest">{t.extractionFailed}</p>
              <p className="text-xs mt-2 text-center max-w-xs">{fileStatus.error}</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 min-h-[60px] lg:min-h-0 py-2">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>
                <p className="text-sm font-medium">{t.pending}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingCard;
