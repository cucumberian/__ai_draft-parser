
import React, { useState } from 'react';
import { Template, ExtractionField, FieldType, Language } from '../types.ts';

interface TemplateEditorProps {
  template: Template;
  language: Language;
  onSave: (template: Template) => void;
  onClose: () => void;
  translations: any;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, language, onSave, onClose, translations: t }) => {
  const [editedTemplate, setEditedTemplate] = useState<Template>(template);

  const addField = () => {
    const newField: ExtractionField = {
      id: Date.now().toString(),
      key: 'new_field',
      label: 'New Field',
      type: FieldType.STRING,
      description: 'Describe what to extract'
    };
    setEditedTemplate(prev => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  const updateField = (id: string, updates: Partial<ExtractionField>) => {
    setEditedTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (id: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">{t.edit}: {editedTemplate.name}</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => onSave(editedTemplate)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              {t.saveTemplate}
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition"
            >
              {t.cancel}
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.templateName}</label>
            <input 
              type="text" 
              value={editedTemplate.name}
              onChange={(e) => setEditedTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="p-3 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition text-lg font-medium"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-700 text-lg">{t.fieldsToExtract}</h3>
            <button 
              onClick={addField}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              {t.addNewField}
            </button>
          </div>

          <div className="space-y-4">
            {editedTemplate.fields.map(field => (
              <div key={field.id} className="relative group bg-slate-50/50 p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-100 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.key}</label>
                    <input 
                      value={field.key}
                      onChange={(e) => updateField(field.id, { key: e.target.value })}
                      className="p-2 border bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.label}</label>
                    <input 
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="p-2 border bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.type}</label>
                    <select 
                      value={field.type}
                      onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                      className="p-2 border bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                      {Object.values(FieldType).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-5 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.promptDescription}</label>
                    <input 
                      value={field.description}
                      onChange={(e) => updateField(field.id, { description: e.target.value })}
                      className="p-2 border bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-center pb-0.5">
                    <button 
                      onClick={() => removeField(field.id)}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Remove Field"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;