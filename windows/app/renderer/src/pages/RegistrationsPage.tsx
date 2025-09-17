import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RegistrationRecord } from '@shared/types/registrations';

type QuickFilterKey = 'all' | 'registered' | 'waitlist' | 'checked_in' | 'cancelled';

type QuickFilterMeta = {
  key: QuickFilterKey;
  status: string | null;
  label: string;
  description: string;
};

const QUICK_FILTERS: QuickFilterMeta[] = [
  { key: 'all', status: null, label: '全部', description: '展示当前条件下的全部报名记录' },
  { key: 'registered', status: 'registered', label: '已报名', description: '已确认参与的报名记录' },
  { key: 'waitlist', status: 'waitlist', label: '候补中', description: '排队等待名额确认的报名' },
  { key: 'checked_in', status: 'checked_in', label: '已签到', description: '活动现场已签到' },
  { key: 'cancelled', status: 'cancelled', label: '已取消', description: '已取消或失效的报名' },
];

const PAGE_SIZE = 20;

type LoadOptions = {
  reset?: boolean;
  filterKey?: QuickFilterKey;
  activity?: string;
  user?: string;
};

const fetchTotal = async (
  params: {
    activityId?: string;
    userId?: string;
    status?: string | null;
  },
): Promise<number> => {
  try {
    const res = await window.api.registrations.list({
      page: 1,
      pageSize: 1,
      filter: {
        ...(params.activityId ? { activityId: params.activityId } : {}),
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    });
    if (res.ok) {
      return res.data.total;
    }
  } catch (err) {
    console.error('[registrations:list] total error', err);
  }
  return 0;
};

const formatDateTime = (value: number | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
};

const RegistrationsPage = () => {
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [activityId, setActivityId] = useState('');
  const [userId, setUserId] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilterKey>('all');
  const [totals, setTotals] = useState<Record<QuickFilterKey, number>>({
    all: 0,
    registered: 0,
    waitlist: 0,
    checked_in: 0,
    cancelled: 0,
  });
  const pageRef = useRef(1);

  const loadRegistrations = async ({
    reset = false,
    filterKey,
    activity,
    user,
  }: LoadOptions = {}) => {
    const targetPage = reset ? 1 : pageRef.current;
    const targetActivity = (activity ?? activityId).trim();
    const targetUser = (user ?? userId).trim();
    const statusKey = filterKey ?? activeFilter;
    const statusMeta = QUICK_FILTERS.find((item) => item.key === statusKey) ?? QUICK_FILTERS[0];
    const statusValue = statusMeta.status;

    if (reset) {
      setLoading(true);
      if (targetPage === 1) setRecords([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const filterPayload = {
        ...(targetActivity ? { activityId: targetActivity } : {}),
        ...(targetUser ? { userId: targetUser } : {}),
        ...(statusValue ? { status: statusValue } : {}),
      };

      const res = await window.api.registrations.list({
        page: targetPage,
        pageSize: PAGE_SIZE,
        filter: filterPayload,
      });

      if (res.ok) {
        const items = res.data.items;
        setRecords((prev) => (reset ? items : [...prev, ...items]));
        setError(null);
        const hasNext = items.length === PAGE_SIZE;
        setHasMore(hasNext);
        pageRef.current = hasNext ? targetPage + 1 : targetPage;
      } else {
        setError(res.error.msg);
        setHasMore(false);
      }

      if (reset) {
        const totalsResult = await Promise.all(
          QUICK_FILTERS.map(async (filter) => {
            const total = await fetchTotal({
              activityId: targetActivity,
              userId: targetUser,
              status: filter.status,
            });
            return [filter.key, total] as const;
          }),
        );
        setTotals(Object.fromEntries(totalsResult) as Record<QuickFilterKey, number>);
      }
    } catch (err) {
      console.error('Failed to load registrations', err);
      setError('加载报名记录时出现异常');
      setHasMore(false);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadRegistrations({ reset: true, filterKey: 'all' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    pageRef.current = 1;
    loadRegistrations({ reset: true });
  };

  const handleReset = () => {
    setActivityId('');
    setUserId('');
    setActiveFilter('all');
    pageRef.current = 1;
    loadRegistrations({ reset: true, filterKey: 'all', activity: '', user: '' });
  };

  const handleLoadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    loadRegistrations();
  };

  const handleQuickFilter = (key: QuickFilterKey) => {
    if (key === activeFilter) return;
    setActiveFilter(key);
    pageRef.current = 1;
    loadRegistrations({ reset: true, filterKey: key });
  };

  const quickFilters = useMemo(() => QUICK_FILTERS, []);

  return (
    <div className="page">
      <header className="page__header">
        <h1>报名记录</h1>
        <p>支持按活动与报名状态筛选，快速查看报名/候补/签到信息。</p>
      </header>

      <section className="card">
        <form className="filters" onSubmit={handleSubmit}>
          <div className="filters__inputs">
            <label className="filters__field">
              <span>活动 ID</span>
              <input
                type="text"
                value={activityId}
                onChange={(event) => setActivityId(event.target.value)}
                placeholder="输入活动 ID"
              />
            </label>
            <label className="filters__field">
              <span>用户 ID</span>
              <input
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="用户 ID 或空"
              />
            </label>
          </div>
          <div className="filters__actions">
            <button type="submit" disabled={loading}>
              {loading ? '查询中…' : '查询'}
            </button>
            <button type="button" className="button button--ghost" onClick={handleReset} disabled={loading}>
              重置
            </button>
            <span className="filters__hint">共 {totals.all} 条报名记录。</span>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="quick-filters">
          {quickFilters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`quick-filters__item${activeFilter === item.key ? ' quick-filters__item--active' : ''}`}
              onClick={() => handleQuickFilter(item.key)}
              disabled={loading}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
              <span className="quick-filters__count">{totals[item.key]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <header className="card__header">
          <h2>列表</h2>
          <span>展示符合条件的报名记录，可进入详情查看具体信息</span>
        </header>

        {loading && records.length === 0 ? (
          <div className="empty-state">正在加载报名记录…</div>
        ) : error ? (
          <div className="empty-state empty-state--error">加载失败：{error}</div>
        ) : records.length === 0 ? (
          <div className="empty-state">暂无数据，试试修改筛选条件。</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>活动</th>
                  <th>报名人</th>
                  <th>状态</th>
                  <th>报名时间</th>
                  <th>签到时间</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.activityId}</td>
                    <td>{record.userId ?? record.guestContact ?? '—'}</td>
                    <td>
                      <span className={`status-pill status-pill--${record.status}`}>{record.status}</span>
                    </td>
                    <td>{formatDateTime(record.registeredAt)}</td>
                    <td>{formatDateTime(record.checkedInAt)}</td>
                    <td>
                      <Link to={`/registrations/${record.id}`}>查看详情</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore ? (
              <div className="table__footer">
                <button type="button" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? '加载中…' : '加载更多'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
};

export default RegistrationsPage;
