import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UserProfile } from '@shared/types/users';
import type { StatsHomeSummary } from '@shared/types/stats';
import type { PermissionRequestRecord } from '@shared/types/permissions';
import type { ServiceRecord } from '@shared/types/services';
import type { AuditLogRecord } from '@shared/types/audits';
import type { ActivityRecord } from '@shared/types/activities';

type RoleKey = 'admin' | 'social_worker' | 'volunteer' | 'parent' | 'guest';

type QuickAction = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  to?: string;
  disabled?: boolean;
};

type StatCard = {
  key: string;
  icon: string;
  label: string;
  value: number;
  description: string;
};

type TaskItem = {
  id: string;
  title: string;
  description: string;
  meta?: string;
  actionLabel: string;
  actionTo?: string;
  disabled?: boolean;
};

type FeedItem = {
  id: string;
  title: string;
  timestamp: number;
  description?: string;
};

const ROLE_DISPLAY: Record<RoleKey, { label: string; tagline: string }> = {
  admin: { label: '管理员', tagline: '统筹审批与平台配置' },
  social_worker: { label: '社工', tagline: '跟进档案与服务进度' },
  volunteer: { label: '志愿者', tagline: '记录自己的服务历程' },
  parent: { label: '家长', tagline: '关注孩子的成长与服务' },
  guest: { label: '访客', tagline: '完成注册以解锁更多功能' },
};

const THEME_CLASS: Record<RoleKey, string> = {
  admin: 'home-hero--admin',
  social_worker: 'home-hero--social',
  volunteer: 'home-hero--volunteer',
  parent: 'home-hero--parent',
  guest: 'home-hero--guest',
};

const TASKS_ROUTE: Record<RoleKey, string> = {
  admin: '/approvals',
  social_worker: '/services',
  volunteer: '/activities',
  parent: '/services',
  guest: '/auth/register',
};

const PERMISSION_FIELD_LABEL: Record<string, string> = {
  id_card: '身份证号',
  phone: '联系电话',
  diagnosis: '医院诊断',
};

const QUICK_ACTIONS: Record<RoleKey, QuickAction[]> = {
  admin: [
    { key: 'global-search', icon: '🔍', title: '全局检索', subtitle: '跨模块快速定位', to: '/patients' },
    { key: 'perm-approval', icon: '🗂️', title: '资料审批', subtitle: '处理待审批的资料', to: '/approvals' },
    { key: 'system-stats', icon: '📊', title: '数据统计', subtitle: '查看平台总体趋势', to: '/stats' },
    { key: 'data-export', icon: '📤', title: '数据导出', subtitle: '导出报表与档案', to: '/exports' },
  ],
  social_worker: [
    { key: 'patient-files', icon: '📁', title: '患者档案', subtitle: '维护患者信息', to: '/patients' },
    { key: 'service-review', icon: '📝', title: '服务审核', subtitle: '跟进记录审核', to: '/services' },
    { key: 'activity-manage', icon: '🎯', title: '活动管理', subtitle: '筹备与报名情况', to: '/activities' },
    { key: 'tenancy-manage', icon: '🏠', title: '安置管理', subtitle: '安排住宿与续期', to: '/tenancies' },
  ],
  volunteer: [
    { key: 'service-record', icon: '❤️', title: '填写服务', subtitle: '补录服务心得', to: '/services/new' },
    { key: 'patient-view', icon: '👀', title: '查看档案', subtitle: '了解服务对象', to: '/patients' },
    { key: 'my-activities', icon: '🎉', title: '报名活动', subtitle: '参与线下活动', to: '/activities' },
    { key: 'guide', icon: '📘', title: '志愿指南', subtitle: '敬请期待', disabled: true },
  ],
  parent: [
    { key: 'service-progress', icon: '📈', title: '服务进度', subtitle: '跟进孩子服务', to: '/services' },
    { key: 'family-activities', icon: '🧸', title: '家庭活动', subtitle: '即将参与的活动', to: '/activities' },
    { key: 'contact', icon: '☎️', title: '联系社工', subtitle: '敬请期待', disabled: true },
    { key: 'community', icon: '🏡', title: '家长社区', subtitle: '敬请期待', disabled: true },
  ],
  guest: [
    { key: 'register', icon: '🧾', title: '账号注册', subtitle: '完善资料以继续', to: '/auth/register' },
    { key: 'explore-services', icon: '🔎', title: '浏览服务', subtitle: '了解桌面端能力', to: '/services' },
    { key: 'explore-activities', icon: '🎯', title: '查看活动', subtitle: '了解线下活动安排', to: '/activities' },
    { key: 'docs', icon: '📚', title: '操作指南', subtitle: '敬请期待', disabled: true },
  ],
};

const normalizeRole = (role: string | null | undefined): RoleKey => {
  if (role === 'admin' || role === 'social_worker' || role === 'volunteer' || role === 'parent') {
    return role;
  }
  return 'guest';
};

const buildStatsCards = (data: StatsHomeSummary): StatCard[] => [
  { key: 'patients', icon: '📁', label: '患者档案', value: data.patients, description: '累计建档数量' },
  { key: 'services', icon: '📝', label: '服务记录', value: data.services, description: '本地存储的服务条目' },
  { key: 'activities', icon: '🎯', label: '线下活动', value: data.activities, description: '活动组织与报名情况' },
  { key: 'tenancies', icon: '🏠', label: '安置记录', value: data.tenancies, description: '住宿安置与跟进' },
];

const formatDateTime = (value: number | string | null | undefined): string => {
  if (value == null) return '—';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatRelativeTime = (value: number | null | undefined): string => {
  if (!value) return '刚刚';
  const now = Date.now();
  const diff = now - value;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}小时前`;
  if (diff < 7 * 86_400_000) return `${Math.round(diff / 86_400_000)}天前`;
  return formatDateTime(value);
};

const buildGreeting = (name?: string | null): string => {
  const hour = new Date().getHours();
  let prefix = '你好';
  if (hour < 6) prefix = '凌晨好';
  else if (hour < 12) prefix = '早上好';
  else if (hour < 14) prefix = '中午好';
  else if (hour < 19) prefix = '下午好';
  else prefix = '晚上好';
  const displayName = name && name.trim().length ? name.trim() : '小家伙伴';
  return `${prefix}，${displayName}`;
};

const getStatusLabel = (status: UserProfile['status'] | null | undefined, fallback: RoleKey): string => {
  if (status === 'active') return '已激活';
  if (status === 'pending') return '待审核';
  if (status === 'rejected') return '已拒绝';
  if (status === 'inactive') return '未激活';
  return fallback === 'guest' ? '访客模式' : '未知状态';
};

const getDetailValue = (source: Record<string, unknown> | null | undefined, key: string): string | null => {
  if (!source || typeof source !== 'object') return null;
  const raw = source[key];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof raw === 'number') {
    return raw.toString();
  }
  return null;
};

const describeAudit = (log: AuditLogRecord): string => {
  const base = log.action.split(/[._]/g).filter(Boolean).join(' · ') || log.action;
  const patientName = getDetailValue(log.details, 'patientName') ?? getDetailValue(log.target, 'patientName');
  const serviceType = getDetailValue(log.details, 'serviceType');
  const parts = [base];
  if (patientName) parts.push(patientName);
  if (serviceType) parts.push(serviceType);
  return parts.join(' · ');
};

const buildAuditDescription = (log: AuditLogRecord): string | undefined => {
  const parts: string[] = [];
  const actor = log.actorId ?? '系统';
  parts.push(`操作人：${actor}`);
  const patientId = getDetailValue(log.details, 'patientId') ?? getDetailValue(log.target, 'patientId');
  if (patientId) parts.push(`关联ID：${patientId}`);
  const reason = getDetailValue(log.details, 'reason');
  if (reason) parts.push(`备注：${reason}`);
  if (log.requestId) parts.push(`请求：${log.requestId}`);
  return parts.length ? parts.join(' · ') : undefined;
};
const HomePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<RoleKey>('guest');
  const [initializing, setInitializing] = useState(true);
  const [statsCards, setStatsCards] = useState<StatCard[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  const isMounted = useRef(true);
  const patientNameCache = useRef(new Map<string, string>());

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const res = await window.api.users.getProfile();
        if (cancelled) return;
        if (res.ok) {
          setProfile(res.data);
          setRole(normalizeRole(res.data?.role));
        } else {
          console.warn('users.getProfile failed', res.error);
          setProfile(null);
          setRole('guest');
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load user profile', error);
          setProfile(null);
          setRole('guest');
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncMeta = async () => {
      try {
        const previous = await window.api.getMeta('last-opened');
        if (!cancelled && typeof previous === 'string' && previous) {
          setLastOpened(previous);
        }
      } catch (error) {
        console.warn('Failed to read last-opened meta', error);
      }
      try {
        await window.api.setMeta('last-opened', new Date().toISOString());
      } catch (error) {
        console.warn('Failed to update last-opened meta', error);
      }
    };
    syncMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await window.api.stats.homeSummary();
      if (!isMounted.current) return;
      if (res.ok) {
        setStatsCards(buildStatsCards(res.data));
        setStatsError(null);
      } else {
        setStatsError(res.error.msg || '获取统计数据失败');
      }
    } catch (error) {
      console.error('Failed to load stats summary', error);
      if (isMounted.current) {
        setStatsError('加载统计数据失败');
      }
    } finally {
      if (isMounted.current) {
        setStatsLoading(false);
      }
    }
  }, []);

  const fetchPatientName = useCallback(
    async (id: string) => {
      if (!id) return '未指定患者';
      const cached = patientNameCache.current.get(id);
      if (cached) return cached;
      try {
        const res = await window.api.patients.get(id);
        if (res.ok) {
          const name =
            res.data.name && res.data.name.trim().length ? res.data.name.trim() : '未命名患者';
          patientNameCache.current.set(id, name);
          return name;
        }
        console.warn('patients.get returned error', res.error);
      } catch (error) {
        console.warn('Failed to fetch patient name', error);
      }
      const fallback = '未指定患者';
      patientNameCache.current.set(id, fallback);
      return fallback;
    },
    []
  );

  const fetchTasksData = useCallback(
    async (currentRole: RoleKey): Promise<TaskItem[]> => {
      if (currentRole === 'admin') {
        const res = await window.api.permissionRequests.list({
          page: 1,
          pageSize: 5,
          filter: { status: 'pending' },
        });
        if (!res.ok) {
          throw new Error(res.error.msg || '获取资料申请失败');
        }
        const items = await Promise.all(
          res.data.items.map(async (item: PermissionRequestRecord) => {
            const patientName = await fetchPatientName(item.patientId);
            const fields =
              item.fields.map((field) => PERMISSION_FIELD_LABEL[field] ?? field).join('、') ||
              '未注明字段';
            return {
              id: item.id,
              title: `资料审批 · ${patientName}`,
              description: `申请字段：${fields}`,
              meta: formatRelativeTime(item.createdAt),
              actionLabel: '前往审批',
              actionTo: '/approvals',
            } satisfies TaskItem;
          })
        );
        return items;
      }
      if (currentRole === 'social_worker') {
        const res = await window.api.services.list({
          page: 1,
          pageSize: 5,
          filter: { status: 'pending' },
        });
        if (!res.ok) {
          throw new Error(res.error.msg || '获取服务记录失败');
        }
        const items = await Promise.all(
          res.data.items.map(async (item: ServiceRecord) => {
            const patientName = await fetchPatientName(item.patientId);
            const dateText = item.date ? item.date : '未填写日期';
            return {
              id: item.id,
              title: `服务审核 · ${item.type}`,
              description: `${patientName} · 服务日期 ${dateText}`,
              meta: formatRelativeTime(item.createdAt),
              actionLabel: '查看详情',
              actionTo: `/services/${item.id}`,
            } satisfies TaskItem;
          })
        );
        return items;
      }
      if (currentRole === 'volunteer') {
        const res = await window.api.activities.list({
          page: 1,
          pageSize: 5,
          filter: { status: 'open' },
        });
        if (!res.ok) {
          throw new Error(res.error.msg || '获取活动列表失败');
        }
        if (!res.data.items.length) {
          return [];
        }
        return res.data.items.map((activity: ActivityRecord) => ({
          id: activity.id,
          title: `报名活动 · ${activity.title}`,
          description: `时间 ${activity.date}${activity.location ? ` · 地点 ${activity.location}` : ''}`,
          meta: formatRelativeTime(activity.createdAt),
          actionLabel: '查看活动',
          actionTo: `/activities/${activity.id}`,
        }));
      }
      if (currentRole === 'parent') {
        const res = await window.api.services.list({
          page: 1,
          pageSize: 5,
          filter: { status: 'approved' },
        });
        if (!res.ok) {
          throw new Error(res.error.msg || '获取服务进度失败');
        }
        const items = await Promise.all(
          res.data.items.map(async (item: ServiceRecord) => {
            const patientName = await fetchPatientName(item.patientId);
            const updatedAt = item.updatedAt ?? item.createdAt;
            return {
              id: item.id,
              title: `服务进度 · ${item.type}`,
              description: `${patientName} · 更新于 ${formatDateTime(updatedAt)}`,
              meta: formatRelativeTime(updatedAt),
              actionLabel: '查看详情',
              actionTo: `/services/${item.id}`,
            } satisfies TaskItem;
          })
        );
        return items;
      }
      return [
        {
          id: 'guest-onboarding',
          title: '完善账号信息',
          description: '前往账号中心完成注册或同步云端资料，以便继续体验桌面端功能。',
          actionLabel: '前往账号中心',
          actionTo: '/auth/register',
        },
      ];
    },
    [fetchPatientName]
  );

  const loadTasks = useCallback(
    async (currentRole: RoleKey) => {
      setTasksLoading(true);
      try {
        const items = await fetchTasksData(currentRole);
        if (!isMounted.current) return;
        setTasks(items);
        setTasksError(null);
      } catch (error) {
        console.error('Failed to load tasks', error);
        if (!isMounted.current) return;
        setTasks([]);
        setTasksError(error instanceof Error ? error.message : '加载待办失败');
      } finally {
        if (isMounted.current) {
          setTasksLoading(false);
        }
      }
    },
    [fetchTasksData]
  );

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await window.api.audits.list({ page: 1, pageSize: 6 });
      if (!isMounted.current) return;
      if (res.ok) {
        const items = res.data.items.map((log: AuditLogRecord) => ({
          id: log.id,
          title: describeAudit(log),
          timestamp: log.createdAt,
          description: buildAuditDescription(log),
        }));
        setFeedItems(items);
        setFeedError(null);
      } else {
        setFeedItems([]);
        setFeedError(res.error.msg || '获取审计记录失败');
      }
    } catch (error) {
      console.error('Failed to load audit feed', error);
      if (isMounted.current) {
        setFeedItems([]);
        setFeedError('加载动态失败');
      }
    } finally {
      if (isMounted.current) {
        setFeedLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (initializing) return;
    loadStats();
    loadTasks(role);
    loadFeed();
  }, [initializing, role, loadStats, loadTasks, loadFeed]);

  const quickActions = useMemo(() => QUICK_ACTIONS[role] ?? QUICK_ACTIONS.guest, [role]);
  const headerClassName = `home-hero ${THEME_CLASS[role]}`;
  const roleDisplay = ROLE_DISPLAY[role];
  const greeting = buildGreeting(profile?.name);
  const rawStatus = profile?.status ?? (role === 'guest' ? 'inactive' : 'unknown');
  const statusLabel = getStatusLabel(profile?.status, role);
  const statusClassName = `home-status home-status--${rawStatus}`;
  const notifications = useMemo(() => tasks.filter((item) => !item.disabled).length, [tasks]);
  const lastOpenedLabel = lastOpened ? formatDateTime(lastOpened) : '首次启动';
  const tasksLink = TASKS_ROUTE[role] ?? '/';
  const headerStats = statsCards.slice(0, 2);

  const handleAction = (action: QuickAction) => {
    if (action.disabled) return;
    if (action.to) {
      navigate(action.to);
    }
  };
  return (
    <div className="page home">
      <header className={headerClassName}>
        <div className="home-hero__primary">
          <span className="home-hero__greeting">{greeting}</span>
          <h1>{roleDisplay.label}</h1>
          <p className="home-hero__tagline">{roleDisplay.tagline}</p>
          <div className="home-hero__meta">
            <span className={statusClassName}>{statusLabel}</span>
            <span className="home-hero__meta-item">通知 {notifications}</span>
            <span className="home-hero__meta-item">上次打开：{lastOpenedLabel}</span>
          </div>
        </div>
        <div className="home-hero__stats">
          {statsLoading && !headerStats.length ? (
            <div className="home-hero__stats-placeholder">统计加载中…</div>
          ) : statsError && !headerStats.length ? (
            <div className="home-hero__stats-placeholder">统计数据暂不可用</div>
          ) : (
            headerStats.map((stat) => (
              <div key={stat.key} className="home-hero__stat">
                <span className="home-hero__stat-icon">{stat.icon}</span>
                <div>
                  <strong>{stat.value.toLocaleString()}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </header>

      <section className="card home-actions">
        <div className="card__header">
          <h2>常用操作</h2>
          <span className="card__meta">
            {initializing ? '正在加载角色信息…' : roleDisplay.tagline}
          </span>
        </div>
        <div className="home-actions__grid">
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`home-action${action.disabled || initializing ? ' home-action--disabled' : ''}`}
              onClick={() => handleAction(action)}
              disabled={action.disabled || initializing}
            >
              <span className="home-action__icon">{action.icon}</span>
              <span className="home-action__title">{action.title}</span>
              <span className="home-action__subtitle">{action.subtitle}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card home-stats">
        <div className="card__header">
          <h2>数据概览</h2>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => loadStats()}
            disabled={statsLoading}
          >
            {statsLoading ? '刷新中…' : '刷新'}
          </button>
        </div>
        {statsLoading && !statsCards.length ? (
          <div className="home-empty">统计数据加载中…</div>
        ) : statsError ? (
          <div className="home-empty home-empty--error">{statsError}</div>
        ) : (
          <div className="home-stats__grid">
            {statsCards.map((card) => (
              <div key={card.key} className="home-stat">
                <span className="home-stat__icon">{card.icon}</span>
                <div className="home-stat__content">
                  <span className="home-stat__label">{card.label}</span>
                  <span className="home-stat__value">{card.value.toLocaleString()}</span>
                  <span className="home-stat__desc">{card.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="home-main-grid">
        <section className="card home-tasks">
          <div className="card__header">
            <h2>待办事项</h2>
            <div className="home-card-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => loadTasks(role)}
                disabled={tasksLoading}
              >
                {tasksLoading ? '刷新中…' : '刷新'}
              </button>
              <Link className="button button--secondary" to={tasksLink}>
                查看全部
              </Link>
            </div>
          </div>
          {tasksLoading && !tasks.length ? (
            <div className="home-empty">正在加载待办…</div>
          ) : tasksError ? (
            <div className="home-empty home-empty--error">{tasksError}</div>
          ) : tasks.length === 0 ? (
            <div className="home-empty">暂无待办事项</div>
          ) : (
            <ul className="home-task-list">
              {tasks.map((task) => (
                <li key={task.id} className="home-task">
                  <div className="home-task__content">
                    <h3>{task.title}</h3>
                    <p>{task.description}</p>
                    {task.meta ? <span className="home-task__meta">{task.meta}</span> : null}
                  </div>
                  <div className="home-task__actions">
                    {task.actionTo ? (
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => navigate(task.actionTo!)}
                        disabled={task.disabled}
                      >
                        {task.actionLabel}
                      </button>
                    ) : (
                      <span className="home-task__meta">{task.actionLabel}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card home-feed">
          <div className="card__header">
            <h2>最近动态</h2>
            <div className="home-card-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => loadFeed()}
                disabled={feedLoading}
              >
                {feedLoading ? '刷新中…' : '刷新'}
              </button>
              <Link className="button button--secondary" to="/audits">
                审计日志
              </Link>
            </div>
          </div>
          {feedLoading && !feedItems.length ? (
            <div className="home-empty">正在加载动态…</div>
          ) : feedError ? (
            <div className="home-empty home-empty--error">{feedError}</div>
          ) : feedItems.length === 0 ? (
            <div className="home-empty">暂无最新动态</div>
          ) : (
            <ul className="home-feed__list">
              {feedItems.map((item) => (
                <li key={item.id} className="home-feed__item">
                  <div className="home-feed__body">
                    <h3>{item.title}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                  <span className="home-feed__time">{formatRelativeTime(item.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
