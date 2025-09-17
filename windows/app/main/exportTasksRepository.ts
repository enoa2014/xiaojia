import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';
import Database from 'better-sqlite3';
import { ExportTaskCreateSchema, ExportTaskHistorySchema, ExportTaskStatusSchema } from '../../shared/schemas/exports.js';
import type { ExportTaskHistoryResult, ExportTaskRecord } from '../../shared/types/exports.js';

type DatabaseHandle = InstanceType<typeof Database>;

type RawExportTaskRow = {
  id: string;
  template_id: string | null;
  type: string;
  params: string | null;
  status: string;
  download_url: string | null;
  client_token: string | null;
  request_id: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  error: string | null;
};

const EXPORT_DIR_NAME = 'exports';

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const serializeParams = (params: Record<string, unknown> | undefined) => {
  if (!params) {
    return '{}';
  }
  try {
    return JSON.stringify(params);
  } catch (error) {
    console.warn('[ExportTasksRepository] failed to stringify params', error);
    return '{}';
  }
};

const parseParams = (raw: string | null): Record<string, unknown> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    console.warn('[ExportTasksRepository] failed to parse params', raw, error);
    return {};
  }
};

const formatTimestampSuffix = (value: number) => {
  const date = new Date(value);
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ];
  return parts.join('');
};

export class ExportTasksRepository {
  private readonly exportDir: string;

  constructor(private readonly db: DatabaseHandle) {
    const userDataDir = app.getPath('userData');
    this.exportDir = path.join(userDataDir, EXPORT_DIR_NAME);
    ensureDir(this.exportDir);
  }

  create(rawInput: unknown): ExportTaskRecord {
    const payload = ExportTaskCreateSchema.parse(rawInput ?? {});
    const now = Date.now();
    const paramsJson = serializeParams(payload.params);

    if (payload.clientToken) {
      const existing = this.db
        .prepare('SELECT * FROM export_tasks WHERE client_token = ? LIMIT 1')
        .get(payload.clientToken) as RawExportTaskRow | undefined;
      if (existing) {
        return this.mapRow(existing);
      }
    }

    const id = randomUUID();

    this.db
      .prepare('INSERT INTO export_tasks (id, template_id, type, params, status, download_url, client_token, request_id, created_at, updated_at, expires_at, error) VALUES (@id, @template_id, @type, @params, @status, @download_url, @client_token, @request_id, @created_at, @updated_at, @expires_at, @error)')
      .run({
        id,
        template_id: payload.templateId ?? null,
        type: payload.type,
        params: paramsJson,
        status: 'pending',
        download_url: null,
        client_token: payload.clientToken ?? null,
        request_id: payload.requestId ?? null,
        created_at: now,
        updated_at: now,
        expires_at: null,
        error: null,
      });

    const record = this.getById(id);
    return record ?? {
      id,
      templateId: payload.templateId ?? null,
      type: payload.type,
      params: payload.params ?? {},
      status: 'pending',
      downloadUrl: null,
      clientToken: payload.clientToken ?? null,
      requestId: payload.requestId ?? null,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
      error: null,
    };
  }

  status(rawInput: unknown): ExportTaskRecord {
    const payload = ExportTaskStatusSchema.parse(rawInput ?? {});
    const record = this.getById(payload.taskId);
    if (!record) {
      throw new Error('E_NOT_FOUND:task not found');
    }

    if (record.status === 'pending' || record.status === 'running') {
      return this.materialize(record);
    }

    return record;
  }

  history(rawParams: unknown): ExportTaskHistoryResult {
    const params = ExportTaskHistorySchema.parse(rawParams ?? {});
    const offset = (params.page - 1) * params.pageSize;

    const rows = this.db
      .prepare('SELECT id, template_id, type, params, status, download_url, client_token, request_id, created_at, updated_at, expires_at, error FROM export_tasks ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(params.pageSize, offset) as RawExportTaskRow[];

    const { total } = this.db
      .prepare('SELECT COUNT(*) as total FROM export_tasks')
      .get() as { total: number };

    return {
      items: rows.map((row) => this.mapRow(row)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  open(pathname: string): boolean {
    if (!pathname) return false;
    try {
      const result = shell.openPath(pathname);
      if (result instanceof Promise) {
        result.catch((error) => console.warn('[ExportTasksRepository] openPath failed', error));
      }
      return true;
    } catch (error) {
      console.error('[ExportTasksRepository] open path failed', error);
      return false;
    }
  }

  private getById(id: string): ExportTaskRecord | null {
    const row = this.db
      .prepare('SELECT id, template_id, type, params, status, download_url, client_token, request_id, created_at, updated_at, expires_at, error FROM export_tasks WHERE id = ?')
      .get(id) as RawExportTaskRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  private materialize(task: ExportTaskRecord): ExportTaskRecord {
    const now = Date.now();
    const expiresAt = now + 60 * 60 * 1000;
    const fileName = task.type + '-' + formatTimestampSuffix(now) + '-' + task.id.slice(0, 8) + '.txt';
    const filePath = path.join(this.exportDir, fileName);

    const contentLines = [
      '# 小家桌面端导出占位文件',
      '任务编号: ' + task.id,
      '导出类型: ' + task.type,
      '模板标识: ' + (task.templateId ?? '未知模板'),
      '生成时间: ' + new Date(now).toLocaleString('zh-CN'),
      '',
      '参数 (JSON):',
      JSON.stringify(task.params, null, 2),
    ];

    try {
      fs.writeFileSync(filePath, contentLines.join('\n'), { encoding: 'utf-8' });
    } catch (error) {
      console.error('[ExportTasksRepository] failed to write export file', error);
      this.db
        .prepare('UPDATE export_tasks SET status = ?, error = ?, updated_at = ? WHERE id = ?')
        .run('failed', 'E_IO_WRITE', now, task.id);
      return {
        ...task,
        status: 'failed',
        error: '无法生成导出文件',
        updatedAt: now,
      };
    }

    this.db
      .prepare('UPDATE export_tasks SET status = ?, download_url = ?, expires_at = ?, updated_at = ?, error = NULL WHERE id = ?')
      .run('done', filePath, expiresAt, now, task.id);

    return {
      ...task,
      status: 'done',
      downloadUrl: filePath,
      expiresAt,
      updatedAt: now,
      error: null,
    };
  }

  private mapRow(row: RawExportTaskRow): ExportTaskRecord {
    return {
      id: String(row.id),
      templateId: row.template_id ?? null,
      type: String(row.type ?? ''),
      params: parseParams(row.params),
      status: (row.status as ExportTaskRecord['status']) ?? 'pending',
      downloadUrl: row.download_url ?? null,
      clientToken: row.client_token ?? null,
      requestId: row.request_id ?? null,
      createdAt: Number(row.created_at ?? Date.now()),
      updatedAt: Number(row.updated_at ?? Date.now()),
      expiresAt: row.expires_at ?? null,
      error: row.error ?? null,
    };
  }
}
