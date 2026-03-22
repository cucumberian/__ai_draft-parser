import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  apiRequest: (options: { url: string; method?: string; headers?: Record<string, string>; body?: string }) => {
    return ipcRenderer.invoke('api-request', options);
  },
});
