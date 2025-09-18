
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  PermissionRequestCreateSchema,
  PermissionRequestDecisionSchema,
  PermissionRequestListSchema,
} from '../schemas/permissions.js';
import type {
  PermissionField,
  PermissionRequestCreateInput,
  PermissionRequestDecisionInput,
  PermissionRequestListResult,
  PermissionRequestRecord,
  PermissionStatus,
} from '../types/permissions.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PermissionRequestListParams = z.infer<typeof PermissionRequestListSchema>;

export type PermissionRequestInsert = {
  id: string;
  requesterId: string;
  patientId: string;
  fields: PermissionField[];
  reason: string;
  status: PermissionStatus;
  expiresAt: number | null;
  decisionBy: string | null;
  decisionReason: string | null;
  approvedAt: number | null;
  rejectedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type PermissionRequestApprovalUpdate = {
  id: string;
  decisionBy: string;
  expiresAt: number;
  approvedAt: number;
  updatedAt: number;
};

export type PermissionRequestRejectionUpdate = {
  id: string;
  decisionBy: string;
  decisionReason: string | null;
  rejectedAt: number;
  updatedAt: number;
};

export interface PermissionRequestsStore {
  list(params: PermissionRequestListParams): PermissionRequestListResult;
  create(data: PermissionRequestInsert): PermissionRequestRecord;
  markApproved(update: PermissionRequestApprovalUpdate): PermissionRequestRecord;
  markRejected(update: PermissionRequestRejectionUpdate): PermissionRequestRecord;
  getById(id: string): PermissionRequestRecord | null;
}

export type PermissionRequestAuditEvent = {
  action: 'permissions.request.submit' | 'permissions.approve' | 'permissions.reject';
  actorId: string | null;
  timestamp: number;
  details: Record<string, unknown>;
};

export type PermissionRequestsAuditLogger = (event: PermissionRequestAuditEvent) => void;

export type PermissionRequestsContext = {
  actorId: string | null;
  roles: string[];
};

type ServiceOptions = {
  auditLogger?: PermissionRequestsAuditLogger;
  clock?: () => number;
};

const isAdmin = (roles: string[]): boolean => roles.includes('admin');

const ensureActor = (context: PermissionRequestsContext): string => {
  if (context.actorId && context.actorId.trim()) {
    return context.actorId;
  }
  throw Object.assign(new Error('需要登录后才能执行此操作'), { code: 'E_AUTH' });
};

const nowMs = () => Date.now();

export class PermissionRequestsService {
  private readonly clock: () => number;

  constructor(private readonly store: PermissionRequestsStore, private readonly options: ServiceOptions = {}) {
    this.clock = options.clock ?? nowMs;
  }

  list(rawParams: unknown, context: PermissionRequestsContext): PermissionRequestListResult {
    const parsed = PermissionRequestListSchema.parse(rawParams ?? {});
    const filter = parsed.filter ? { ...parsed.filter } : {};
    if (!isAdmin(context.roles)) {
      if (!context.actorId) {
        return { items: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
      }
      filter.requesterId = context.actorId;
    }

    return this.store.list({
      page: parsed.page,
      pageSize: parsed.pageSize,
      filter: Object.keys(filter).length ? filter : undefined,
    });
  }

  create(rawInput: unknown, context: PermissionRequestsContext): PermissionRequestRecord {
    const payload = PermissionRequestCreateSchema.parse(rawInput ?? {});
    const actorId = ensureActor(context);
    const now = this.clock();
    const expiresAt = now + (payload.expiresDays ?? 30) * DAY_MS;
    const record = this.store.create({
      id: randomUUID(),
      requesterId: actorId,
      patientId: payload.patientId,
      fields: payload.fields,
      reason: payload.reason,
      status: 'pending',
      expiresAt,
      decisionBy: null,
      decisionReason: null,
      approvedAt: null,
      rejectedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    this.options.auditLogger?.({
      action: 'permissions.request.submit',
      actorId,
      timestamp: now,
      details: { requestId: record.id, patientId: record.patientId, fields: record.fields },
    });

    return record;
  }

  approve(rawInput: unknown, context: PermissionRequestsContext): PermissionRequestRecord {
    if (!isAdmin(context.roles)) {
      throw Object.assign(new Error('需要管理员权限'), { code: 'E_PERM' });
    }
    const payload = PermissionRequestDecisionSchema.parse({ ...(rawInput ?? {}), action: 'approve' });
    const actorId = ensureActor(context);
    const existing = this.store.getById(payload.id);
    if (!existing) {
      throw Object.assign(new Error('审批请求不存在'), { code: 'E_NOT_FOUND' });
    }

    const now = this.clock();
    const expiresDays = payload.expiresDays ?? 30;
    const expiresAt = now + expiresDays * DAY_MS;

    const record = this.store.markApproved({
      id: payload.id,
      decisionBy: actorId,
      expiresAt,
      approvedAt: now,
      updatedAt: now,
    });

    this.options.auditLogger?.({
      action: 'permissions.approve',
      actorId,
      timestamp: now,
      details: { requestId: payload.id, expiresAt },
    });

    return record;
  }

  reject(rawInput: unknown, context: PermissionRequestsContext): PermissionRequestRecord {
    if (!isAdmin(context.roles)) {
      throw Object.assign(new Error('需要管理员权限'), { code: 'E_PERM' });
    }
    const payload = PermissionRequestDecisionSchema.parse({ ...(rawInput ?? {}), action: 'reject' });
    const actorId = ensureActor(context);
    const existing = this.store.getById(payload.id);
    if (!existing) {
      throw Object.assign(new Error('审批请求不存在'), { code: 'E_NOT_FOUND' });
    }

    const now = this.clock();
    const reason = payload.reason?.trim() ?? null;

    const record = this.store.markRejected({
      id: payload.id,
      decisionBy: actorId,
      decisionReason: reason,
      rejectedAt: now,
      updatedAt: now,
    });

    this.options.auditLogger?.({
      action: 'permissions.reject',
      actorId,
      timestamp: now,
      details: { requestId: payload.id, reason },
    });

    return record;
  }
}
