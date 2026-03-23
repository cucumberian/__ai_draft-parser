import { useState, useCallback, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const addFiles = useCallback(async (filesList: FileList | null, imageMaxSize: number | null) => {
    if (!filesList) return;

    const newFiles: FileStatus[] = Array.from(filesList).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: '',
      imageForModel: undefined,
      status: 'pending' as const,
      sha256: undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (const entry of newFiles) {
      let previewUrl = '';
      let imageForModel: string | undefined;

      try {
        if (isPdfFile(entry.file)) {
          previewUrl = await pdfToImagePreview(entry.file, 1.5);
        } else if (isTifFile(entry.file)) {
          const tifResult = await tifToImageBase64(entry.file);
          previewUrl = tifResult.previewUrl;
          imageForModel = tifResult.base64;
        } else {
          previewUrl = await fileToBase64(entry.file);
        }
      } catch (err) {
        console.error('Error generating preview:', err);
      }

      try {
        if (isPdfFile(entry.file) && !imageForModel) {
          imageForModel = await pdfToImageBase64(entry.file, 2);
        }
      } catch (err) {
        console.error('Error generating model image:', err);
      }

      if (imageForModel) {
        const modelMime = isPdfFile(entry.file) || isTifFile(entry.file) ? 'image/png' : entry.file.type;
        imageForModel = await optimizeImage(imageForModel, modelMime, imageMaxSize);
      }

      let sha256: string | undefined;
      try {
        sha256 = await calculateHash(entry.file);
      } catch {}

      updateFileStatus(entry.id, { previewUrl, imageForModel, sha256 });
    }
  }, [optimizeImage, updateFileStatus]);

  return {
    files,
    fileInputRef,
    addFiles,
    removeFile,
    updateFileStatus,
    clearFiles
  };
}
