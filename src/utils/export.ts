import { FileStatus } from '../../types';

export function exportToJson(files: FileStatus[]): void {
  const completedFiles = files.filter(f => f.status === 'completed' && f.result);
  if (completedFiles.length === 0) return;

  const exportData = completedFiles.map(f => ({
    filename: f.file.name,
    ...f.result
  }));

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `blueprint-data-${getDateStamp()}.json`);
}

export function exportToCsv(files: FileStatus[]): void {
  const completedFiles = files.filter(f => f.status === 'completed' && f.result);
  if (completedFiles.length === 0) return;

  const allKeys = new Set<string>();
  completedFiles.forEach(f => {
    if (f.result) Object.keys(f.result).forEach(k => allKeys.add(k));
  });
  const headers = ['filename', ...Array.from(allKeys)];

  const rows = completedFiles.map(f => {
    const row: Record<string, string> = { filename: f.file.name };
    allKeys.forEach(key => {
      const value = f.result?.[key];
      if (Array.isArray(value)) {
        row[key] = value.join('; ');
      } else if (value === null || value === undefined) {
        row[key] = '';
      } else {
        row[key] = String(value);
      }
    });
    return row;
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = row[h] || '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `blueprint-data-${getDateStamp()}.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getDateStamp(): string {
  return new Date().toISOString().split('T')[0];
}
