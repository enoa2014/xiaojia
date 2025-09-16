import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import * as electron from 'electron';
import { runMigrations } from './migrations.js';

type SQLiteInstance = InstanceType<typeof Database>;

const { app } = electron;

let instance: SQLiteInstance | null = null;

export const ensureDatabase = (): SQLiteInstance => {
  if (instance) {
    return instance;
  }

  const userDataDir = app.getPath('userData');
  fs.mkdirSync(userDataDir, { recursive: true });

  const dbPath = path.join(userDataDir, 'xiaojia-desktop.sqlite');
  instance = new Database(dbPath);

  instance.pragma('journal_mode = WAL');
  runMigrations(instance);

  return instance;
};

export const getDatabase = (): SQLiteInstance => {
  if (!instance) {
    throw new Error('Database is not initialised. Call ensureDatabase() first.');
  }

  return instance;
};
