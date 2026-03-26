
export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  ARRAY_STRING = 'ARRAY_STRING',
  ARRAY_NUMBER = 'ARRAY_NUMBER'
}

export interface ExtractionField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  description: string;
}

export interface Template {
  id: string;
  name: string;
  fields: ExtractionField[];
  version?: string;
  description?: string;
}

export interface FileStatus {
  id: string;
  file: File;
  previewUrl: string;
  imageForModel?: string;
  rotation: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  sha256?: string;
  verified?: boolean;
  imageMissing?: boolean;
}

export interface ProjectFileEntry {
  fileName: string;
  path: string;
  sha256: string;
  result?: any;
  verified?: boolean;
  rotation?: number;
}

export interface Project {
  version: string;
  name: string;
  template: Template;
  activeTemplateId: string;
  files: ProjectFileEntry[];
  createdAt: string;
  updatedAt: string;
}

export type View = 'dashboard' | 'templates' | 'settings';
export type Language = 'ru' | 'en';

export interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AppSettings {
  openai: OpenAIConfig;
  systemPrompt: string;
  temperature: number;
  imageMaxSize: number | null;
}

export interface AppState {
  templates: Template[];
  activeTemplateId: string;
  files: FileStatus[];
  currentView: View;
  currentLanguage: Language;
  settings: AppSettings;
}
