import React, { useState, useRef, useEffect } from 'react';
import { View, Language } from '../types.ts';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  currentLanguage: Language;
  onLanguageToggle: () => void;
  translations: any;
  onSaveProject: () => void;
  onLoadProject: () => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  currentLanguage,
  onLanguageToggle,
  translations: t,
  onSaveProject,
  onLoadProject,
  projectName,
  onProjectNameChange,
}) => {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(projectName);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(projectName);
  }, [projectName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitNameEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== projectName) {
      onProjectNameChange(trimmed);
    } else {
      setEditName(projectName);
    }
    setIsEditingName(false);
  };

  return (
    <header className="bg-slate-900 text-white py-2 px-4 shadow-lg sticky top-0 z-40 drag-region">
      <div className="container mx-auto flex justify-between items-center gap-2">
        {/* Logo + Project name */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-2 cursor-pointer no-drag"
            onClick={() => onViewChange('dashboard')}
          >
            <div className="p-1.5 bg-blue-600 rounded-lg shadow-blue-900/20 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h1"/></svg>
            </div>
          </div>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitNameEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') commitNameEdit(); if (e.key === 'Escape') { setEditName(projectName); setIsEditingName(false); } }}
              className="hidden md:block bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px] max-w-[280px]"
            />
          ) : (
            <h1
              className="hidden md:block text-sm font-bold tracking-tight leading-none cursor-pointer hover:text-blue-400 transition-colors truncate max-w-[280px]"
              onClick={() => setIsEditingName(true)}
              title={currentLanguage === 'ru' ? 'Нажмите для редактирования' : 'Click to edit'}
            >
              {projectName}
            </h1>
          )}

          {/* Project dropdown */}
          <div className="relative no-drag" ref={projectMenuRef}>
            <button
              onClick={() => setProjectMenuOpen(!projectMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all duration-200 group"
              title={t.project}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-green-400 transition-colors">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="text-[10px] font-bold tracking-wider text-slate-300 group-hover:text-white uppercase hidden sm:inline">
                {t.project}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {projectMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => { onSaveProject(); setProjectMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  {t.saveProject}
                </button>
                <button
                  onClick={() => { onLoadProject(); setProjectMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition border-t border-slate-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="12 11 12 17"/><polyline points="9 14 12 11 15 14"/></svg>
                  {t.loadProject}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar no-drag">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${currentView === 'dashboard' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
          >
            {t.dashboard}
          </button>
          <button
            onClick={() => onViewChange('templates')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${currentView === 'templates' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
          >
            {t.templates}
          </button>
          <button
            onClick={() => onViewChange('settings')}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${currentView === 'settings' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
          >
            {t.settings}
          </button>
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 no-drag">
          <button
            onClick={onLanguageToggle}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all duration-200 group"
            aria-label="Toggle Language"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-blue-400 transition-colors">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
            </svg>
            <span className="text-[10px] font-bold tracking-wider text-slate-300 group-hover:text-white uppercase">
              {currentLanguage}
            </span>
          </button>
        </div>
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </header>
  );
};

export default Header;
