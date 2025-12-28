
import React, { useRef } from 'react';
import { Template, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface TemplateManagerProps {
  templates: Template[];
  activeTemplateId: string;
  language: Language;
  onSelect: (id: string) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onImport: (template: Template) => void;
  onCreate: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ 
  templates, 
  activeTemplateId, 
  language,
  onSelect, 
  onEdit, 
  onDelete, 
  onImport,
  onCreate 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  const handleExport = (template: Template) => {
    const data = JSON.stringify(template, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const template = JSON.parse(event.target?.result as string) as Template;
        if (template.name && Array.isArray(template.fields)) {
          template.id = Math.random().toString(36).substr(2, 9);
          onImport(template);
        } else {
          alert('Invalid template format');
        }
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t.extractionTemplates}</h2>
          <p className="text-slate-500 text-sm">{t.manageTemplates}</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
          <button 
            onClick={handleImportClick}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {t.importJson}
          </button>
          <button 
            onClick={onCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            {t.newTemplate}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div 
            key={template.id} 
            className={`p-5 rounded-xl border-2 transition ${
              activeTemplateId === template.id 
                ? 'border-blue-500 bg-blue-50/30' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800 truncate pr-2">{template.name}</h3>
              {activeTemplateId === template.id && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded">{t.active}</span>
              )}
            </div>
            
            <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
              {template.fields.length} {t.fieldsToExtract.toLowerCase()}. 
              {template.description || t.noDescription}
            </p>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <button 
                onClick={() => onSelect(template.id)}
                className="text-xs font-bold text-blue-600 hover:underline uppercase"
              >
                {t.use}
              </button>
              <button 
                onClick={() => onEdit(template)}
                className="text-xs font-bold text-slate-600 hover:underline uppercase"
              >
                {t.edit}
              </button>
              <button 
                onClick={() => handleExport(template)}
                className="text-xs font-bold text-slate-600 hover:underline uppercase"
              >
                {t.export}
              </button>
              <div className="flex-1"></div>
              {templates.length > 1 && (
                <button 
                  onClick={() => onDelete(template.id)}
                  className="text-xs font-bold text-red-500 hover:text-red-700 uppercase"
                >
                  {t.delete}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateManager;
