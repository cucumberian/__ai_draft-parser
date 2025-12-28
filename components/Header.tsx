
import React from 'react';
import { View, Language, Template } from '../types';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  currentLanguage: Language;
  onLanguageToggle: () => void;
  templates: Template[];
  activeTemplateId: string;
  onTemplateChange: (id: string) => void;
  translations: any;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  currentLanguage,
  onLanguageToggle,
  templates,
  activeTemplateId,
  onTemplateChange,
  translations: t,
}) => {
  return (
    <header className="bg-slate-900 text-white py-2 px-4 shadow-lg sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center gap-2">
        {/* Logo & Name */}
        <div 
          className="flex items-center gap-2 cursor-pointer shrink-0" 
          onClick={() => onViewChange('dashboard')}
        >
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-blue-900/20 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h1"/></svg>
          </div>
          <div className="hidden md:block">
            <h1 className="text-base font-bold tracking-tight leading-none">BluePrint Insight</h1>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">AI Drawing Extraction</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
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
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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

          <div className="hidden lg:flex flex-col items-end border-l border-slate-700 pl-4">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">{t.activePattern}</div>
            <select 
              value={activeTemplateId}
              onChange={(e) => onTemplateChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-blue-400 focus:outline-none cursor-pointer hover:text-blue-300 transition-colors py-0 h-auto"
            >
              {templates.map(tmpl => (
                <option key={tmpl.id} value={tmpl.id} className="bg-slate-900 text-white">
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </header>
  );
};

export default Header;
