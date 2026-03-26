import { useState, useCallback, useRef, useEffect } from 'react';
import { FileStatus } from '../../types';
import { pdfToImageBase64, pdfToImagePreview, isPdfFile } from '../../services/pdfService';
import { isTifFile, tifToImageBase64 } from '../../services/tifService';
import { scaleImageToMaxSize } from '../../services/imageOptimizer';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

const calculateHash = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

export function useFiles() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const filesRef = useRef<FileStatus[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep ref in sync
  useEffect(() => { filesRef.current = files; }, [files]);

  const optimizeImage = useCallback(async (base64: string, mimeType: string, maxSize: number | null): Promise<string> => {
    if (!maxSize || !mimeType.startsWith('image/')) return base64;
    try {
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const result = await scaleImageToMaxSize(dataUrl, maxSize);
      return result.base64;
    } catch {
      return base64;
    }
  }, []);

  const updateFileStatus = useCallback((id: string, updates: Partial<FileStatus>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const toggleVerification = useCallback((id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, verified: !f.verified } : f));
  }, []);

  const addFiles = useCallback(async (filesList: FileList | null, imageMaxSize: number | null, onProgress?: (current: number, total: number) => void) => {
    if (!filesList) return;

    const rawFiles = Array.from(filesList);

    // Phase 1: fast parallel hash computation
    const hashes = await Promise.all(rawFiles.map(f => calculateHash(f)));

    const existing = filesRef.current;

    // Find files that match existing imageMissing cards — fill them in
    const toFill: { existingId: string; file: File; sha256: string }[] = [];
    const filledHashes = new Set<string>();

    for (let i = 0; i < rawFiles.length; i++) {
      const h = hashes[i];
      if (filledHashes.has(h)) continue;
      const match = existing.find(f => f.imageMissing && f.sha256 === h);
      if (match) {
        toFill.push({ existingId: match.id, file: rawFiles[i], sha256: h });
        filledHashes.add(h);
      }
    }

    // Remaining files: filter duplicates, create new entries
    const seenNew = new Set<string>();
    const unique: { file: File; sha256: string }[] = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const h = hashes[i];
      if (filledHashes.has(h) || seenNew.has(h)) continue;
      if (existing.some(f => f.sha256 === h && !f.imageMissing)) continue;
      unique.push({ file: rawFiles[i], sha256: h });
      seenNew.add(h);
    }

    const newFiles: FileStatus[] = unique.map(({ file, sha256 }) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: '',
      imageForModel: undefined,
      rotation: 0,
      status: 'pending' as const,
      sha256,
    }));

    // Merge: fill existing + add new
    setFiles(prev => [
      ...prev.map(f => {
        const fill = toFill.find(t => t.existingId === f.id);
        if (fill) return { ...f, file: fill.file, imageMissing: false as const };
        return f;
      }),
      ...newFiles,
    ]);

    const totalToProcess = toFill.length + newFiles.length;
    if (onProgress) onProgress(0, totalToProcess);

    // Build list of items to process (existing filled + new)
    const processList: { id: string; file: File }[] = [
      ...toFill.map(t => ({ id: t.existingId, file: t.file })),
      ...newFiles.map(f => ({ id: f.id, file: f.file })),
    ];

    // Phase 2: heavy preview/image conversion
    for (let i = 0; i < processList.length; i++) {
      const { id, file } = processList[i];
      if (onProgress) onProgress(i + 1, totalToProcess);
      let previewUrl = '';
      let imageForModel: string | undefined;

      try {
        if (isPdfFile(file)) {
          previewUrl = await pdfToImagePreview(file, 1.5);
        } else if (isTifFile(file)) {
          const tifResult = await tifToImageBase64(file);
          previewUrl = tifResult.previewUrl;
          imageForModel = tifResult.base64;
        } else {
          previewUrl = await fileToBase64(file);
        }
      } catch (err) {
        console.error('Error generating preview:', err);
      }

      try {
        if (isPdfFile(file) && !imageForModel) {
          imageForModel = await pdfToImageBase64(file, 2);
        }
      } catch (err) {
        console.error('Error generating model image:', err);
      }

      if (imageForModel) {
        const modelMime = isPdfFile(file) || isTifFile(file) ? 'image/png' : file.type;
        imageForModel = await optimizeImage(imageForModel, modelMime, imageMaxSize);
      }

      updateFileStatus(id, { previewUrl, imageForModel });
    }
  }, [optimizeImage, updateFileStatus]);

  return {
    files,
    fileInputRef,
    addFiles,
    removeFile,
    updateFileStatus,
    clearFiles,
    toggleVerification,
    setFiles,
  };
}
