import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  UserLoginSchema,
  UserRegisterSchema,
  UserRegistrationsListSchema,
  UserReviewRegistrationSchema,
} from '../../shared/schemas/users.js';
import type { UserProfile, UserRelativeInfo, UserStatus } from '../../shared/types/users.js';
import type {
  UserRegistrationListResult,
  UserRegistrationRecord,
  UserRegistrationStatus,
} from '../../shared/types/userRegistrations.js';

type DatabaseHandle = InstanceType<typeof Database>;

type RawUserRow = {
  id: string;
  open_id: string | null;
  status: string | null;
  role: string | null;
  roles: string | null;
  name: string | null;
  avatar: string | null;
  starred_patients: string | null;
  created_at: number | null;
  updated_at: number | null;
  nickname: string | null;
  login_name: string | null;
  phone: string | null;
  id_card: string | null;
  apply_role: string | null;
  relative: string | null;
  reject_reason: string | null;
  is_test: number | null;
  decision_by: string | null;
  decision_reason: string | null;
  approved_at: number | null;
  rejected_at: number | null;
};

type RawAccountRow = {
  id: string;
  username: string;
  password_hash: string;
  role: string | null;
  status: string;
  open_id: string | null;
  is_test: number | null;
  created_at: number;
  updated_at: number;
};

const META_CURRENT_USER_KEY = 'current_user_id';

const maskIdCard = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 8) return '********';
  return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
};

const maskPhone = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{11}$/.test(trimmed)) return '***********';
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
};

const normalizeStatus = (status: string | null): UserStatus => {
  if (status === 'pending' || status === 'active' || status === 'rejected') return status;
  if (status === 'inactive') return 'inactive';
  return 'unknown';
};

const normalizeApplyRole = (value: string | null): 'volunteer' | 'parent' | null => {
  if (value === 'volunteer' || value === 'parent') return value;
  return null;
};

const normalizeRelativeRelation = (value: string | null): UserRelativeInfo['relation'] => {
  if (value === 'father' || value === 'mother' || value === 'guardian' || value === 'other') return value;
  return null;
};

const toTimestamp = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
    const iso = Date.parse(value);
    return Number.isNaN(iso) ? null : iso;
  }
  return null;
};

const toRoleArray = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
};

const toRoleJson = (roles: string[]): string => JSON.stringify(roles);

const hashPassword = (password: string): string => {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
};

const verifyPassword = (password: string, hashed: string): boolean => {
  const [saltHex, hashHex] = hashed.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) {
    return false;
  }
  try {
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};

export class UsersRepository {
  constructor(private readonly db: DatabaseHandle) {}

  register(rawInput: unknown): { status: 'pending' } {
    const input = UserRegisterSchema.parse(rawInput ?? {});
    const nickname = input.nickname?.trim() ?? '';
    const loginName = (nickname || input.name).trim();
    if (!loginName) {
      throw new Error('E_VALIDATE:登录名不能为空');
    }

    const now = Date.now();
    const currentUserId = this.getCurrentUserId();
    const existingUser = currentUserId ? this.findRawUserById(currentUserId) : null;
    const existingAccount = existingUser ? this.findAccountByUserId(existingUser.open_id ?? existingUser.id) : null;
    const accountByUsername = this.findAccountByUsername(loginName);

    if (accountByUsername && accountByUsername.open_id !== (existingUser?.open_id ?? existingUser?.id ?? null)) {
      throw new Error('E_CONFLICT:LOGIN_NAME_EXISTS');
    }

    const relativePayload =
      input.applyRole === 'parent' && input.relative
        ? {
            patientName: input.relative.patientName.trim(),
            relation: input.relative.relation,
            patientIdCard: input.relative.patientIdCard.trim(),
          }
        : null;
    const relativeJson = relativePayload ? JSON.stringify(relativePayload) : null;

    if (existingUser && existingUser.status === 'pending') {
      const samePayload =
        (existingUser.name ?? '') === input.name &&
        (existingUser.phone ?? '') === input.phone &&
        (existingUser.id_card ?? '') === input.idCard &&
        (existingUser.apply_role ?? '') === input.applyRole &&
        (existingUser.login_name ?? '') === loginName &&
        (existingUser.nickname ?? '') === (nickname || '') &&
        (existingUser.relative ?? null) === (relativeJson ?? null);
      if (samePayload) {
        if (existingAccount && existingAccount.status === 'pending') {
          return { status: 'pending' };
        }
      }
    }

    const userId = existingUser?.id ?? randomUUID();
    const openId = existingUser?.open_id ?? userId;
    const createdAt = existingUser?.created_at ?? now;
    const starredPatients = existingUser?.starred_patients ?? null;
    const rolesJson = existingUser?.roles ?? toRoleJson([]);
    const avatar = existingUser?.avatar ?? null;
    const isTest = input.test ? 1 : existingUser?.is_test ?? 0;

    if (existingUser) {
      const stmt = this.db.prepare(
        `UPDATE users SET
          open_id = @open_id,
          status = @status,
          role = NULL,
          roles = @roles,
          name = @name,
          avatar = @avatar,
          starred_patients = @starred_patients,
          nickname = @nickname,
          login_name = @login_name,
          phone = @phone,
          id_card = @id_card,
          apply_role = @apply_role,
          relative = @relative,
          reject_reason = NULL,
          is_test = @is_test,
          decision_by = NULL,
          decision_reason = NULL,
          approved_at = NULL,
          rejected_at = NULL,
          updated_at = @updated_at
        WHERE id = @id`
      );
      stmt.run({
        id: userId,
        open_id: openId,
        status: 'pending',
        roles: rolesJson,
        name: input.name,
        avatar,
        starred_patients: starredPatients,
        nickname: nickname || null,
        login_name: loginName,
        phone: input.phone,
        id_card: input.idCard,
        apply_role: input.applyRole,
        relative: relativeJson,
        is_test: isTest,
        updated_at: now,
      });
    } else {
      const stmt = this.db.prepare(
        `INSERT INTO users (
          id, open_id, status, role, roles, name, avatar, starred_patients,
          created_at, updated_at, nickname, login_name, phone, id_card,
          apply_role, relative, reject_reason, is_test, decision_by, decision_reason, approved_at, rejected_at
        ) VALUES (
          @id, @open_id, @status, NULL, @roles, @name, NULL, @starred_patients,
          @created_at, @updated_at, @nickname, @login_name, @phone, @id_card,
          @apply_role, @relative, NULL, @is_test, NULL, NULL, NULL, NULL
        )`
      );
      stmt.run({
        id: userId,
        open_id: openId,
        status: 'pending',
        roles: rolesJson,
        name: input.name,
        starred_patients: starredPatients,
        created_at: createdAt,
        updated_at: now,
        nickname: nickname || null,
        login_name: loginName,
        phone: input.phone,
        id_card: input.idCard,
        apply_role: input.applyRole,
        relative: relativeJson,
        is_test: isTest,
      });
    }

    const passwordHash = hashPassword(input.password);
    if (existingAccount) {
      const stmt = this.db.prepare(
        `UPDATE auth_accounts SET
          username = @username,
          password_hash = @password_hash,
          role = @role,
          status = 'pending',
          open_id = @open_id,
          is_test = @is_test,
          updated_at = @updated_at
        WHERE id = @id`
      );
      stmt.run({
        id: existingAccount.id,
        username: loginName,
        password_hash: passwordHash,
        role: input.applyRole,
        open_id: openId,
        is_test: isTest,
        updated_at: now,
      });
    } else {
      const stmt = this.db.prepare(
        `INSERT INTO auth_accounts (
          id, username, password_hash, role, status, open_id, is_test, created_at, updated_at
        ) VALUES (
          @id, @username, @password_hash, @role, 'pending', @open_id, @is_test, @created_at, @updated_at
        )`
      );
      stmt.run({
        id: randomUUID(),
        username: loginName,
        password_hash: passwordHash,
        role: input.applyRole,
        open_id: openId,
        is_test: isTest,
        created_at: now,
        updated_at: now,
      });
    }

    this.writeAuditLog(openId, 'user_register', {
      applyRole: input.applyRole,
      isTest: isTest === 1,
    });

    this.setCurrentUserId(userId);
    return { status: 'pending' };
  }

  login(rawInput: unknown): { user: UserProfile } {
    const input = UserLoginSchema.parse(rawInput ?? {});
    const account = this.findAccountByUsername(input.username);
    if (!account) {
      throw new Error('E_AUTH:INVALID_CREDENTIALS');
    }
    if (!verifyPassword(input.password, account.password_hash)) {
      throw new Error('E_AUTH:INVALID_CREDENTIALS');
    }

    const user = this.findRawUserById(account.open_id ?? '');
    if (!user) {
      throw new Error('E_AUTH:USER_NOT_FOUND');
    }

    this.setCurrentUserId(user.id);
    this.writeAuditLog(account.open_id ?? user.id, 'user_login', {
      username: account.username,
      status: account.status,
    });

    return { user: this.mapUserRow(user) };
  }

  listRegistrations(rawParams: unknown): UserRegistrationListResult {
    const params = UserRegistrationsListSchema.parse(rawParams ?? {});
    const bindings: Array<string | number> = [];
    const where: string[] = [];

    if (params.status) {
      where.push('status = ?');
      bindings.push(params.status);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const selectSql =
      `SELECT id, open_id, status, role, roles, name, avatar, starred_patients,
              created_at, updated_at, nickname, login_name, phone, id_card,
              apply_role, relative, reject_reason, is_test,
              decision_by, decision_reason, approved_at, rejected_at
         FROM users ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`;

    const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;

    const rows = this.db
      .prepare(selectSql)
      .all(...bindings, params.pageSize, offset) as RawUserRow[];

    const { total } = this.db.prepare(countSql).get(...bindings) as { total: number };

    return {
      items: rows.map((row) => this.mapRegistrationRow(row)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  reviewRegistration(rawInput: unknown): UserRegistrationRecord {
    const input = UserReviewRegistrationSchema.parse(rawInput ?? {});
    const user = this.findRawUserById(input.id);
    if (!user) {
      throw new Error('E_NOT_FOUND:REGISTRATION');
    }

    const openId = user.open_id ?? user.id;
    const now = Date.now();
    const reviewerId = input.reviewerId ?? 'desktop-admin';

    if (input.action === 'approve') {
      const role = input.role ?? user.apply_role ?? 'volunteer';
      const stmt = this.db.prepare(
        `UPDATE users SET
          status = 'active',
          role = @role,
          roles = @roles,
          reject_reason = NULL,
          decision_by = @decision_by,
          decision_reason = NULL,
          approved_at = @approved_at,
          rejected_at = NULL,
          updated_at = @updated_at
        WHERE id = @id`
      );
      stmt.run({
        id: user.id,
        role,
        roles: toRoleJson([role]),
        decision_by: reviewerId,
        approved_at: now,
        updated_at: now,
      });

      this.updateAuthAccount(openId, {
        status: 'active',
        role,
        updated_at: now,
      });

      this.writeAuditLog(openId, 'user_review', {
        action: 'approve',
        role,
        reviewer: reviewerId,
      });
    } else {
      const reason = input.reason?.trim() ?? '';
      const stmt = this.db.prepare(
        `UPDATE users SET
          status = 'rejected',
          role = NULL,
          roles = @roles,
          reject_reason = @reject_reason,
          decision_by = @decision_by,
          decision_reason = @decision_reason,
          approved_at = NULL,
          rejected_at = @rejected_at,
          updated_at = @updated_at
        WHERE id = @id`
      );
      stmt.run({
        id: user.id,
        roles: toRoleJson([]),
        reject_reason: reason,
        decision_by: reviewerId,
        decision_reason: reason || null,
        rejected_at: now,
        updated_at: now,
      });

      this.updateAuthAccount(openId, {
        status: 'rejected',
        role: null,
        updated_at: now,
      });

      this.writeAuditLog(openId, 'user_review', {
        action: 'reject',
        reason,
        reviewer: reviewerId,
      });
    }

    const updated = this.findRawUserById(user.id);
    if (!updated) {
      throw new Error('E_INTERNAL:REGISTRATION_REFRESH_FAILED');
    }
    return this.mapRegistrationRow(updated);
  }

  getCurrentProfile(): UserProfile | null {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return null;
    }
    const user = this.findRawUserById(userId);
    if (!user) {
      return null;
    }
    return this.mapUserRow(user);
  }

  logout(): void {
    this.clearCurrentUserId();
  }

  private mapUserRow(row: RawUserRow): UserProfile {
    const relative = this.parseRelative(row.relative ?? null);
    return {
      id: row.id,
      openId: row.open_id ?? row.id,
      status: normalizeStatus(row.status),
      role: row.role ?? null,
      roles: toRoleArray(row.roles ?? null),
      name: row.name ?? null,
      nickname: row.nickname ?? null,
      loginName: row.login_name ?? null,
      phone: row.phone ?? null,
      phoneMasked: maskPhone(row.phone ?? null),
      idCardMasked: maskIdCard(row.id_card ?? null),
      applyRole: normalizeApplyRole(row.apply_role ?? null),
      relative,
      rejectReason: row.reject_reason ?? null,
      avatar: row.avatar ?? null,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
      isTest: row.is_test === 1,
    };
  }

  private mapRegistrationRow(row: RawUserRow): UserRegistrationRecord {
    const relative = this.parseRelative(row.relative ?? null);
    const status = normalizeStatus(row.status) as UserRegistrationStatus;
    return {
      id: row.id,
      name: row.name ?? null,
      phoneMasked: maskPhone(row.phone ?? null),
      applyRole: (normalizeApplyRole(row.apply_role ?? null) ?? 'volunteer') as 'volunteer' | 'parent',
      relativePatientName: relative?.patientName ?? null,
      relativeRelation: relative?.relation ?? null,
      relativePatientIdCard: relative?.patientIdCardMasked ?? null,
      status,
      decisionBy: row.decision_by ?? null,
      decisionReason: row.decision_reason ?? null,
      approvedAt: toTimestamp(row.approved_at),
      rejectedAt: toTimestamp(row.rejected_at),
      createdAt: row.created_at ?? Date.now(),
      updatedAt: row.updated_at ?? Date.now(),
    };
  }

  private parseRelative(raw: string | null): UserRelativeInfo | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      const patientName = typeof parsed.patientName === 'string' ? parsed.patientName : null;
      const relation = typeof parsed.relation === 'string' ? parsed.relation : null;
      const patientIdCard = typeof parsed.patientIdCard === 'string' ? parsed.patientIdCard : null;
      return {
        patientName,
        relation: normalizeRelativeRelation(relation),
        patientIdCardMasked: maskIdCard(patientIdCard),
      };
    } catch (error) {
      console.warn('[usersRepository] failed to parse relative json', error);
      return null;
    }
  }

  private findRawUserById(id: string | null): RawUserRow | null {
    if (!id) return null;
    const stmt = this.db.prepare(
      `SELECT id, open_id, status, role, roles, name, avatar, starred_patients,
              created_at, updated_at, nickname, login_name, phone, id_card,
              apply_role, relative, reject_reason, is_test,
              decision_by, decision_reason, approved_at, rejected_at
       FROM users WHERE id = ?`
    );
    const row = stmt.get(id) as RawUserRow | undefined;
    return row ?? null;
  }

  private findAccountByUsername(username: string): RawAccountRow | null {
    const stmt = this.db.prepare(
      `SELECT id, username, password_hash, role, status, open_id, is_test, created_at, updated_at
       FROM auth_accounts WHERE username = ?`
    );
    const row = stmt.get(username) as RawAccountRow | undefined;
    return row ?? null;
  }

  private findAccountByUserId(userId: string | null): RawAccountRow | null {
    if (!userId) return null;
    const stmt = this.db.prepare(
      `SELECT id, username, password_hash, role, status, open_id, is_test, created_at, updated_at
       FROM auth_accounts WHERE open_id = ?`
    );
    const row = stmt.get(userId) as RawAccountRow | undefined;
    return row ?? null;
  }

  private updateAuthAccount(openId: string, patch: { status: string; role: string | null; updated_at: number }): void {
    const stmt = this.db.prepare(
      `UPDATE auth_accounts SET
        status = @status,
        role = @role,
        updated_at = @updated_at
       WHERE open_id = @open_id`
    );
    stmt.run({
      open_id: openId,
      status: patch.status,
      role: patch.role,
      updated_at: patch.updated_at,
    });
  }

  private getCurrentUserId(): string | null {
    const stmt = this.db.prepare('SELECT value FROM meta WHERE key = ?');
    const row = stmt.get(META_CURRENT_USER_KEY) as { value?: string } | undefined;
    return row?.value ?? null;
  }

  private setCurrentUserId(userId: string): void {
    const stmt = this.db.prepare(
      'INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    stmt.run(META_CURRENT_USER_KEY, userId);
  }

  private clearCurrentUserId(): void {
    const stmt = this.db.prepare('DELETE FROM meta WHERE key = ?');
    stmt.run(META_CURRENT_USER_KEY);
  }

  private writeAuditLog(actorId: string, action: string, details: Record<string, unknown>): void {
    try {
      const stmt = this.db.prepare(
        `INSERT INTO audit_logs (id, actor_id, action, target, request_id, details, created_at)
         VALUES (@id, @actor_id, @action, @target, NULL, @details, @created_at)`
      );
      stmt.run({
        id: randomUUID(),
        actor_id: actorId,
        action,
        target: JSON.stringify({ userId: actorId }),
        details: JSON.stringify(details ?? {}),
        created_at: Date.now(),
      });
    } catch (error) {
      console.warn('[usersRepository] failed to write audit log', error);
    }
  }
}
