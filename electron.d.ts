export interface ElectronAPIResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  error?: string;
}

export interface ElectronAPI {
  platform: string;
  apiRequest: (options: { url: string; method?: string; headers?: Record<string, string>; body?: string }) => Promise<ElectronAPIResponse>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
