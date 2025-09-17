import { contextBridge, ipcRenderer } from 'electron';
import type { PatientListResult, PatientRecord } from '../../shared/types/patients.js';
import type { ActivityListResult, ActivityRecord } from '../../shared/types/activities.js';
import type { RegistrationListResult, RegistrationRecord } from '../../shared/types/registrations.js';
import type { TenancyListResult, TenancyRecord } from '../../shared/types/tenancies.js';
import type { ServiceListResult, ServiceRecord } from '../../shared/types/services.js';
import type {
  StatsDailyRequest,
  StatsHomeSummary,
  StatsMonthlyRequest,
  StatsSeriesResponse,
  StatsWeeklyRequest,
  StatsYearlyRequest,
} from '../../shared/types/stats.js';
import type {
  PermissionRequestCreateInput,
  PermissionRequestListResult,
  PermissionRequestRecord,
} from '../../shared/types/permissions.js';
import type { AuditLogListResult } from '../../shared/types/audits.js';
import type { ExportTaskHistoryResult, ExportTaskRecord } from '../../shared/types/exports.js';

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
  registrations: {
    list: (params?: unknown) =>
      ipcRenderer.invoke('registrations:list', params) as Promise<ApiResult<RegistrationListResult>>,
    get: (id: string) => ipcRenderer.invoke('registrations:get', id) as Promise<ApiResult<RegistrationRecord>>,
    create: (input: unknown) =>
      ipcRenderer.invoke('registrations:create', input) as Promise<ApiResult<RegistrationRecord>>,
    update: (input: unknown) =>
      ipcRenderer.invoke('registrations:update', input) as Promise<ApiResult<RegistrationRecord>>,
  },
  tenancies: {
    list: (params?: unknown) =>
      ipcRenderer.invoke('tenancies:list', params) as Promise<ApiResult<TenancyListResult>>,
    get: (id: string) => ipcRenderer.invoke('tenancies:get', id) as Promise<ApiResult<TenancyRecord>>,
    create: (input: unknown) =>
      ipcRenderer.invoke('tenancies:create', input) as Promise<ApiResult<TenancyRecord>>,
    update: (input: unknown) =>
      ipcRenderer.invoke('tenancies:update', input) as Promise<ApiResult<TenancyRecord>>,
  },
  services: {
    list: (params?: unknown) =>
      ipcRenderer.invoke('services:list', params) as Promise<ApiResult<ServiceListResult>>,
    get: (id: string) => ipcRenderer.invoke('services:get', id) as Promise<ApiResult<ServiceRecord>>,
    create: (input: unknown) =>
      ipcRenderer.invoke('services:create', input) as Promise<ApiResult<ServiceRecord>>,
    review: (input: unknown) =>
      ipcRenderer.invoke('services:review', input) as Promise<ApiResult<ServiceRecord>>,
  },
  permissionRequests: {
    list: (params?: unknown) =>
      ipcRenderer.invoke('permissionRequests:list', params) as Promise<ApiResult<PermissionRequestListResult>>,
    create: (input: PermissionRequestCreateInput) =>
      ipcRenderer.invoke('permissionRequests:create', input) as Promise<ApiResult<PermissionRequestRecord>>,
    approve: (id: string, options?: { expiresDays?: number }) =>
      ipcRenderer.invoke('permissionRequests:approve', { id, ...(options ?? {}) }) as Promise<ApiResult<PermissionRequestRecord>>,
    reject: (id: string, reason: string) =>
      ipcRenderer.invoke('permissionRequests:reject', { id, reason }) as Promise<ApiResult<PermissionRequestRecord>>,
  },
  exports: {
    create: (input: unknown) =>
      ipcRenderer.invoke('exports:create', input) as Promise<ApiResult<ExportTaskRecord>>,
    status: (params: unknown) =>
      ipcRenderer.invoke('exports:status', params) as Promise<ApiResult<ExportTaskRecord>>,
    history: (params?: unknown) =>
      ipcRenderer.invoke('exports:history', params) as Promise<ApiResult<ExportTaskHistoryResult>>,
    open: (filePath: string) =>
      ipcRenderer.invoke('exports:open', filePath) as Promise<ApiResult<{ opened: boolean }>>,
  },
  audits: {
    list: (params?: unknown) =>
      ipcRenderer.invoke('audits:list', params) as Promise<ApiResult<AuditLogListResult>>,
  },
  stats: {
    homeSummary: () =>
      ipcRenderer.invoke('stats:homeSummary') as Promise<ApiResult<StatsHomeSummary>>,
    daily: (params: StatsDailyRequest) =>
      ipcRenderer.invoke('stats:daily', params) as Promise<ApiResult<StatsSeriesResponse>>,
    weekly: (params: StatsWeeklyRequest) =>
      ipcRenderer.invoke('stats:weekly', params) as Promise<ApiResult<StatsSeriesResponse>>,
    monthly: (params: StatsMonthlyRequest) =>
      ipcRenderer.invoke('stats:monthly', params) as Promise<ApiResult<StatsSeriesResponse>>,
    yearly: (params: StatsYearlyRequest) =>
      ipcRenderer.invoke('stats:yearly', params) as Promise<ApiResult<StatsSeriesResponse>>,
  },
};

contextBridge.exposeInMainWorld('api', api);

export type DesktopBridge = typeof api;

declare global {
  interface Window {
    api: DesktopBridge;
  }
}
