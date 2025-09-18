import { contextBridge, ipcRenderer } from 'electron';
const api = {
    ping: () => ipcRenderer.invoke('system:ping'),
    getMeta: (key) => ipcRenderer.invoke('db:meta:get', key),
    setMeta: (key, value) => ipcRenderer.invoke('db:meta:set', key, value),
    users: {
        getProfile: () => ipcRenderer.invoke('users:getProfile'),
        register: (input) => ipcRenderer.invoke('users:register', input),
        login: (input) => ipcRenderer.invoke('users:login', input),
        logout: () => ipcRenderer.invoke('users:logout'),
        listRegistrations: (params) => ipcRenderer.invoke('users:listRegistrations', params),
        reviewRegistration: (input) => ipcRenderer.invoke('users:reviewRegistration', input),
    },
    patients: {
        list: (params) => ipcRenderer.invoke('patients:list', params),
        get: (id) => ipcRenderer.invoke('patients:get', id),
        create: (input) => ipcRenderer.invoke('patients:create', input),
        update: (input) => ipcRenderer.invoke('patients:update', input),
    },
    activities: {
        list: (params) => ipcRenderer.invoke('activities:list', params),
        get: (id) => ipcRenderer.invoke('activities:get', id),
        create: (input) => ipcRenderer.invoke('activities:create', input),
        update: (input) => ipcRenderer.invoke('activities:update', input),
    },
    registrations: {
        list: (params) => ipcRenderer.invoke('registrations:list', params),
        get: (id) => ipcRenderer.invoke('registrations:get', id),
        create: (input) => ipcRenderer.invoke('registrations:create', input),
        update: (input) => ipcRenderer.invoke('registrations:update', input),
    },
    tenancies: {
        list: (params) => ipcRenderer.invoke('tenancies:list', params),
        get: (id) => ipcRenderer.invoke('tenancies:get', id),
        create: (input) => ipcRenderer.invoke('tenancies:create', input),
        update: (input) => ipcRenderer.invoke('tenancies:update', input),
    },
    services: {
        list: (params) => ipcRenderer.invoke('services:list', params),
        get: (id) => ipcRenderer.invoke('services:get', id),
        create: (input) => ipcRenderer.invoke('services:create', input),
        review: (input) => ipcRenderer.invoke('services:review', input),
    },
    permissionRequests: {
        list: (params) => ipcRenderer.invoke('permissionRequests:list', params),
        create: (input) => ipcRenderer.invoke('permissionRequests:create', input),
        approve: (id, options) => ipcRenderer.invoke('permissionRequests:approve', { id, ...(options ?? {}) }),
        reject: (id, reason) => ipcRenderer.invoke('permissionRequests:reject', { id, reason }),
    },
    exports: {
        create: (input) => ipcRenderer.invoke('exports:create', input),
        status: (params) => ipcRenderer.invoke('exports:status', params),
        history: (params) => ipcRenderer.invoke('exports:history', params),
        open: (filePath) => ipcRenderer.invoke('exports:open', filePath),
    },
    audits: {
        list: (params) => ipcRenderer.invoke('audits:list', params),
    },
    stats: {
        homeSummary: () => ipcRenderer.invoke('stats:homeSummary'),
        daily: (params) => ipcRenderer.invoke('stats:daily', params),
        weekly: (params) => ipcRenderer.invoke('stats:weekly', params),
        monthly: (params) => ipcRenderer.invoke('stats:monthly', params),
        yearly: (params) => ipcRenderer.invoke('stats:yearly', params),
    },
};
contextBridge.exposeInMainWorld('api', api);
