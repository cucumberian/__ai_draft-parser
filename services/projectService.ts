import { FileStatus, Project, ProjectFileEntry, Template } from '../types';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getDateStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').slice(0, 100) || 'project';
}

export function exportProject(
  files: FileStatus[],
  template: Template,
  activeTemplateId: string,
  projectName: string = 'Untitled Project'
): void {
  const projectFiles: ProjectFileEntry[] = files
    .filter(f => f.sha256)
    .map(f => ({
      fileName: f.file.name,
      path: f.file.name,
      sha256: f.sha256!,
      result: f.result || undefined,
      verified: f.verified || false,
      rotation: f.rotation || undefined,
    }));

  const project: Project = {
    version: '1.0',
    name: projectName,
    template,
    activeTemplateId,
    files: projectFiles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${sanitizeFilename(projectName)}.json`);
}

export function importProject(jsonString: string): Project {
  const data = JSON.parse(jsonString);

  if (!data.version || !data.files || !data.template) {
    throw new Error('Invalid project file format');
  }

  return data as Project;
}

export interface MatchResult {
  matched: Map<string, File>;        // sha256 -> File
  unmatchedProject: ProjectFileEntry[]; // файлы проекта без совпадений
  unmatchedDropped: File[];           // сброшенные файлы без совпадений в проекте
}

export async function matchFiles(
  projectEntries: ProjectFileEntry[],
  droppedFiles: FileList | File[]
): Promise<MatchResult> {
  const files = Array.from(droppedFiles);
  const fileHashes = new Map<string, File>();

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      fileHashes.set(hash, file);
    } catch {
      // skip files that can't be hashed
    }
  }

  const matched = new Map<string, File>();
  const matchedHashes = new Set<string>();

  for (const entry of projectEntries) {
    const file = fileHashes.get(entry.sha256);
    if (file) {
      matched.set(entry.sha256, file);
      matchedHashes.add(entry.sha256);
    }
  }

  const unmatchedProject = projectEntries.filter(e => !matched.has(e.sha256));
  const usedFiles = new Set(matched.values());
  const unmatchedDropped = files.filter(f => !usedFiles.has(f));

  return { matched, unmatchedProject, unmatchedDropped };
}
