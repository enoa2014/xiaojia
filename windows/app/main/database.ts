import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { app } from 'electron';

let instance: Database.Database | null = null;

export const ensureDatabase = (): Database.Database => {
  if (instance) {
    return instance;
  }

  const userDataDir = app.getPath('userData');
  fs.mkdirSync(userDataDir, { recursive: true });

  const dbPath = path.join(userDataDir, 'xiaojia-desktop.sqlite');
  instance = new Database(dbPath);

  instance.pragma('journal_mode = WAL');
  instance.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return instance;
};

export const getDatabase = (): Database.Database => {
  if (!instance) {
    throw new Error('Database is not initialised. Call ensureDatabase() first.');
  }

  return instance;
};
