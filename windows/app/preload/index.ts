import { contextBridge, ipcRenderer } from 'electron';
import type { PatientListResult, PatientRecord } from '../../shared/types/patients.js';
import type { ActivityListResult, ActivityRecord } from '../../shared/types/activities.js';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string } };

const api = {
  ping: () => ipcRenderer.invoke('system:ping'),
  getMeta: (key: string) => ipcRenderer.invoke('db:meta:get', key),
  setMeta: (key: string, value: string) => ipcRenderer.invoke('db:meta:set', key, value),
  patients: {
    list: (params?: unknown) =>
      ipcRenderer.invoke('patients:list', params) as Promise<ApiResult<PatientListResult>>,
    get: (id: string) => ipcRenderer.invoke('patients:get', id) as Promise<ApiResult<PatientRecord>>,
    create: (input: unknown) =>
      ipcRenderer.invoke('patients:create', input) as Promise<ApiResult<PatientRecord>>,
    update: (input: unknown) =>
      ipcRenderer.invoke('patients:update', input) as Promise<ApiResult<PatientRecord>>,
  },
  activities: {
    list: (params?: unknown) =>
      ipcRenderer.invoke('activities:list', params) as Promise<ApiResult<ActivityListResult>>,
    get: (id: string) => ipcRenderer.invoke('activities:get', id) as Promise<ApiResult<ActivityRecord>>,
    create: (input: unknown) =>
      ipcRenderer.invoke('activities:create', input) as Promise<ApiResult<ActivityRecord>>,
    update: (input: unknown) =>
      ipcRenderer.invoke('activities:update', input) as Promise<ApiResult<ActivityRecord>>,
  },
};

contextBridge.exposeInMainWorld('api', api);

export type DesktopBridge = typeof api;

declare global {
  interface Window {
    api: DesktopBridge;
  }
}
