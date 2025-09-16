import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: () => ipcRenderer.invoke('system:ping'),
  getMeta: (key: string) => ipcRenderer.invoke('db:meta:get', key),
  setMeta: (key: string, value: string) => ipcRenderer.invoke('db:meta:set', key, value),
};

contextBridge.exposeInMainWorld('api', api);

export type DesktopBridge = typeof api;

declare global {
  interface Window {
    api: DesktopBridge;
  }
}
