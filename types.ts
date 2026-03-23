
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
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  sha256?: string;
}

export type View = 'dashboard' | 'templates' | 'settings';
export type Language = 'ru' | 'en';

export type AIProvider = 'openai' | 'ollama';

export interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface AppSettings {
  provider: AIProvider;
  openai?: OpenAIConfig;
  ollama?: OllamaConfig;
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
