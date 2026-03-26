import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileStatus, Template, Language } from '../types.ts';
import FullscreenTopPanel from './FullscreenTopPanel.tsx';

interface FullscreenPreviewProps {
  files: FileStatus[];
  currentIndex: number;
  activeTemplate: Template;
  language: Language;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onUpdateResult: (id: string, result: any) => void;
  onToggleVerification?: (id: string) => void;
  onRotate?: (id: string, degrees: number) => void;
  translations: any;
}

const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({
  files,
  currentIndex,
  activeTemplate,
  language,
  onClose,
  onNavigate,
  onUpdateResult,
  onToggleVerification,
  onRotate,
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

  // Use a ref so keyboard handler always reads latest value
  const toggleRef = useRef(onToggleVerification);
  toggleRef.current = onToggleVerification;
  const filesRef = useRef(files);
  filesRef.current = files;
  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { goPrev(); return; }
      if (e.key === 'ArrowRight') { goNext(); return; }
      if ((e.key === ' ' || e.key === 'Enter') && toggleRef.current) {
        e.preventDefault();
        const currentFile = filesRef.current[indexRef.current];
        if (currentFile) toggleRef.current(currentFile.id);
      }
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

      {/* Top panel */}
      <FullscreenTopPanel
        file={file}
        currentIndex={currentIndex}
        filesCount={files.length}
        activeTemplate={activeTemplate}
        language={language}
        localResult={localResult}
        onValueChange={handleValueChange}
        onToggleVerification={onToggleVerification}
        t={t}
        filesRef={filesRef}
        indexRef={indexRef}
        toggleRef={toggleRef}
      />

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
        className="max-w-[calc(100vw-6rem)] max-h-[calc(100vh-8rem)] object-contain rounded-lg shadow-2xl transition-transform duration-200"
        style={{ transform: `rotate(${file.rotation}deg)` }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Rotate buttons */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onRotate?.(file.id, (file.rotation - 90 + 360) % 360); }}
          className="p-3 bg-white/20 hover:bg-white/35 rounded-full text-white transition shadow-lg"
          title={language === 'ru' ? 'Повернуть влево' : 'Rotate left'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRotate?.(file.id, (file.rotation + 90) % 360); }}
          className="p-3 bg-white/20 hover:bg-white/35 rounded-full text-white transition shadow-lg"
          title={language === 'ru' ? 'Повернуть вправо' : 'Rotate right'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>
    </div>
  );
};

export default FullscreenPreview;
