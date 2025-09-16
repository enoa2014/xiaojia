import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { ensureDatabase, getDatabase } from './database';

const isDevelopment = process.env.NODE_ENV !== 'production';

const resolvePreloadPath = (): string => {
  if (isDevelopment) {
    return path.resolve(__dirname, '../../dist/preload/index.js');
  }

  return path.resolve(__dirname, '../preload/index.js');
};

const resolveRendererUrl = (): string => {
  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  return path.resolve(__dirname, '../renderer/index.html');
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
