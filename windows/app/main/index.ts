import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { ensureDatabase, getDatabase } from './database.js';
import { PatientsRepository } from './patientsRepository.js';
import { ActivitiesRepository } from './activitiesRepository.js';
import { RegistrationsRepository } from './registrationsRepository.js';
import { TenanciesRepository } from './tenanciesRepository.js';
import { ServicesRepository } from './servicesRepository.js';
import { StatsRepository } from './statsRepository.js';
import { PermissionRequestsRepository } from './permissionRequestsRepository.js';
import { ExportTasksRepository } from './exportTasksRepository.js';
import { AuditLogsRepository } from './auditLogsRepository.js';

const createPatientsRepository = () => new PatientsRepository(getDatabase());
const createActivitiesRepository = () => new ActivitiesRepository(getDatabase());
const createRegistrationsRepository = () => new RegistrationsRepository(getDatabase());
const createTenanciesRepository = () => new TenanciesRepository(getDatabase());
const createServicesRepository = () => new ServicesRepository(getDatabase());
const createStatsRepository = () => new StatsRepository(getDatabase());
const createPermissionRequestsRepository = () => new PermissionRequestsRepository(getDatabase());
const createExportTasksRepository = () => new ExportTasksRepository(getDatabase());
const createAuditLogsRepository = () => new AuditLogsRepository(getDatabase());

const isDevelopment = process.env.NODE_ENV !== 'production';

console.log('[main] userData path:', app.getPath('userData'));

const pickFirstExisting = (candidates: string[]): string => {
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate expected file. Checked: ${candidates.join(', ')}`);
};

const resolvePreloadPath = (): string => {
  const candidates = [
    path.resolve(__dirname, '../../../preload/app/preload/index.js'),
    path.resolve(__dirname, '../../preload/app/preload/index.js'),
    path.resolve(__dirname, '../preload/index.js'),
  ];

  return pickFirstExisting(candidates);
};

const resolveRendererUrl = (): string => {
  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  const candidates = [
    path.resolve(__dirname, '../../../renderer/index.html'),
    path.resolve(__dirname, '../../renderer/index.html'),
    path.resolve(__dirname, '../renderer/index.html'),
  ];

  return pickFirstExisting(candidates);
};

const createMainWindow = async (): Promise<void> => {
  ensureDatabase();

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      devTools: isDevelopment,
    },
  });

  const rendererUrl = resolveRendererUrl();
  if (rendererUrl.startsWith('http')) {
    await mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.once('dom-ready', () => {
      if (isDevelopment) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    });
  } else {
    await mainWindow.loadFile(rendererUrl);
  }
};

const mapError = (err: unknown) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const code = error.message.startsWith('E_') ? error.message : 'E_INTERNAL';
  return { ok: false, error: { code, msg: error.message } };
};

const registerPatientIpc = () => {
  ipcMain.handle('patients:list', (_event, params) => {
    try {
      const repo = createPatientsRepository();
      const data = repo.list(params);
      try {
        const db = getDatabase();
        const rawRows = db.prepare('SELECT COUNT(*) as total FROM patients').get();
        console.log('[patients:list] db total', rawRows);
      } catch (dbErr) {
        console.error('[patients:list] db inspect failed', dbErr);
      }
      console.log('[patients:list] params', params);
      console.log('[patients:list] count', data.items.length);
      return { ok: true, data };
    } catch (err) {
      console.error('patients:list failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('patients:get', (_event, id: string) => {
    try {
      const repo = createPatientsRepository();
      const record = repo.getById(String(id));
      if (!record) {
        return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'patient not found' } };
      }
      return { ok: true, data: record };
    } catch (err) {
      console.error('patients:get failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('patients:create', (_event, input) => {
    try {
      const repo = createPatientsRepository();
      const record = repo.create(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('patients:create failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('patients:update', (_event, input) => {
    try {
      const repo = createPatientsRepository();
      const record = repo.update(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('patients:update failed', err);
      return mapError(err);
    }
  });
};

const registerActivityIpc = () => {
  ipcMain.handle('activities:list', (_event, params) => {
    try {
      const repo = createActivitiesRepository();
      const data = repo.list(params);
      try {
        const db = getDatabase();
        const rawRows = db.prepare('SELECT COUNT(*) as total FROM patients').get();
        console.log('[patients:list] db total', rawRows);
      } catch (dbErr) {
        console.error('[patients:list] db inspect failed', dbErr);
      }
      console.log('[patients:list] params', params);
      console.log('[patients:list] count', data.items.length);
      return { ok: true, data };
    } catch (err) {
      console.error('activities:list failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('activities:get', (_event, id: string) => {
    try {
      const repo = createActivitiesRepository();
      const record = repo.getById(String(id));
      if (!record) {
        return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'activity not found' } };
      }
      return { ok: true, data: record };
    } catch (err) {
      console.error('activities:get failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('activities:create', (_event, input) => {
    try {
      const repo = createActivitiesRepository();
      const record = repo.create(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('activities:create failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('activities:update', (_event, input) => {
    try {
      const repo = createActivitiesRepository();
      const record = repo.update(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('activities:update failed', err);
      return mapError(err);
    }
  });
};

const registerRegistrationIpc = () => {
  ipcMain.handle('registrations:list', (_event, params) => {
    try {
      const repo = createRegistrationsRepository();
      const data = repo.list(params);
      try {
        const db = getDatabase();
        const rawRows = db.prepare('SELECT COUNT(*) as total FROM patients').get();
        console.log('[patients:list] db total', rawRows);
      } catch (dbErr) {
        console.error('[patients:list] db inspect failed', dbErr);
      }
      console.log('[patients:list] params', params);
      console.log('[patients:list] count', data.items.length);
      return { ok: true, data };
    } catch (err) {
      console.error('registrations:list failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('registrations:get', (_event, id: string) => {
    try {
      const repo = createRegistrationsRepository();
      const record = repo.getById(String(id));
      if (!record) {
        return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'registration not found' } };
      }
      return { ok: true, data: record };
    } catch (err) {
      console.error('registrations:get failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('registrations:create', (_event, input) => {
    try {
      const repo = createRegistrationsRepository();
      const record = repo.create(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('registrations:create failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('registrations:update', (_event, input) => {
    try {
      const repo = createRegistrationsRepository();
      const record = repo.update(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('registrations:update failed', err);
      return mapError(err);
    }
  });
};

const registerIpcHandlers = (): void => {
  ipcMain.handle('system:ping', () => ({ ok: true, message: 'pong' }));

  ipcMain.handle('db:meta:get', (_event, key: string) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM meta WHERE key = ?');
    const row = stmt.get(key) as { value?: string } | undefined;
    return row?.value ?? null;
  });

  ipcMain.handle('db:meta:set', (_event, key: string, value: string) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    stmt.run(key, value);
    return { ok: true };
  });

  registerPatientIpc();
  registerActivityIpc();
  registerRegistrationIpc();
  registerTenancyIpc();
  registerServiceIpc();
  registerStatsIpc();
  registerAuditLogIpc();
  registerExportTaskIpc();
  registerPermissionRequestIpc();
};

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});









const registerAuditLogIpc = () => {
  ipcMain.handle('audits:list', (_event, params) => {
    try {
      const repo = createAuditLogsRepository();
      const data = repo.list(params);
      return { ok: true, data };
    } catch (err) {
      console.error('audits:list failed', err);
      return mapError(err);
    }
  });
};

const registerExportTaskIpc = () => {
  ipcMain.handle('exports:create', (_event, params) => {
    try {
      const repo = createExportTasksRepository();
      const data = repo.create(params);
      return { ok: true, data };
    } catch (err) {
      console.error('exports:create failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('exports:status', (_event, params) => {
    try {
      const repo = createExportTasksRepository();
      const data = repo.status(params);
      return { ok: true, data };
    } catch (err) {
      console.error('exports:status failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('exports:history', (_event, params) => {
    try {
      const repo = createExportTasksRepository();
      const data = repo.history(params);
      return { ok: true, data };
    } catch (err) {
      console.error('exports:history failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('exports:open', (_event, filePath: string) => {
    try {
      const repo = createExportTasksRepository();
      const opened = repo.open(String(filePath || ''));
      return { ok: true, data: { opened } };
    } catch (err) {
      console.error('exports:open failed', err);
      return mapError(err);
    }
  });
};

const registerTenancyIpc = () => {
  ipcMain.handle('tenancies:list', (_event, params) => {
    try {
      const repo = createTenanciesRepository();
      const data = repo.list(params);
      return { ok: true, data };
    } catch (err) {
      console.error('tenancies:list failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('tenancies:get', (_event, id: string) => {
    try {
      const repo = createTenanciesRepository();
      const record = repo.getById(String(id));
      if (!record) {
        return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'tenancy not found' } };
      }
      return { ok: true, data: record };
    } catch (err) {
      console.error('tenancies:get failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('tenancies:create', (_event, input) => {
    try {
      const repo = createTenanciesRepository();
      const record = repo.create(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('tenancies:create failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('tenancies:update', (_event, input) => {
    try {
      const repo = createTenanciesRepository();
      const record = repo.update(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('tenancies:update failed', err);
      return mapError(err);
    }
  });
};

const registerServiceIpc = () => {
  ipcMain.handle('services:list', (_event, params) => {
    try {
      const repo = createServicesRepository();
      const data = repo.list(params);
      return { ok: true, data };
    } catch (err) {
      console.error('services:list failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('services:get', (_event, id: string) => {
    try {
      const repo = createServicesRepository();
      const record = repo.getById(String(id));
      if (!record) {
        return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'service not found' } };
      }
      return { ok: true, data: record };
    } catch (err) {
      console.error('services:get failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('services:create', (_event, input) => {
    try {
      const repo = createServicesRepository();
      const record = repo.create(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('services:create failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('services:review', (_event, input) => {
    try {
      const repo = createServicesRepository();
      const record = repo.review(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('services:review failed', err);
      return mapError(err);
    }
  });
};

const registerStatsIpc = () => {
  ipcMain.handle('stats:homeSummary', () => {
    try {
      const repo = createStatsRepository();
      const data = repo.homeSummary();
      return { ok: true, data };
    } catch (err) {
      console.error('stats:homeSummary failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('stats:daily', (_event, params) => {
    try {
      const repo = createStatsRepository();
      const data = repo.daily(params);
      return { ok: true, data };
    } catch (err) {
      console.error('stats:daily failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('stats:weekly', (_event, params) => {
    try {
      const repo = createStatsRepository();
      const data = repo.weekly(params);
      return { ok: true, data };
    } catch (err) {
      console.error('stats:weekly failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('stats:monthly', (_event, params) => {
    try {
      const repo = createStatsRepository();
      const data = repo.monthly(params);
      return { ok: true, data };
    } catch (err) {
      console.error('stats:monthly failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('stats:yearly', (_event, params) => {
    try {
      const repo = createStatsRepository();
      const data = repo.yearly(params);
      return { ok: true, data };
    } catch (err) {
      console.error('stats:yearly failed', err);
      return mapError(err);
    }
  });
};

const registerPermissionRequestIpc = () => {
  ipcMain.handle('permissionRequests:list', (_event, params) => {
    try {
      const repo = createPermissionRequestsRepository();
      const data = repo.list(params);
      return { ok: true, data };
    } catch (err) {
      console.error('permissionRequests:list failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('permissionRequests:create', (_event, input) => {
    try {
      const repo = createPermissionRequestsRepository();
      const record = repo.create(input);
      return { ok: true, data: record };
    } catch (err) {
      console.error('permissionRequests:create failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('permissionRequests:approve', (_event, params) => {
    try {
      const repo = createPermissionRequestsRepository();
      const record = repo.decide({ ...(params ?? {}), action: 'approve' });
      return { ok: true, data: record };
    } catch (err) {
      console.error('permissionRequests:approve failed', err);
      return mapError(err);
    }
  });

  ipcMain.handle('permissionRequests:reject', (_event, params) => {
    try {
      const repo = createPermissionRequestsRepository();
      const record = repo.decide({ ...(params ?? {}), action: 'reject' });
      return { ok: true, data: record };
    } catch (err) {
      console.error('permissionRequests:reject failed', err);
      return mapError(err);
    }
  });
};
