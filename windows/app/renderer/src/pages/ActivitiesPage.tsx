import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityRecord } from '@shared/types/activities';

type QuickFilterKey = 'all' | 'open' | 'closed';

type QuickFilterMeta = {
  key: QuickFilterKey;
  status: string | null;
  label: string;
  description: string;
};

const QUICK_FILTERS: QuickFilterMeta[] = [
  { key: 'all', status: null, label: '全部', description: '展示当前筛选条件下的所有活动' },
  { key: 'open', status: 'open', label: '进行中', description: '正在报名或进行的活动' },
  { key: 'closed', status: 'closed', label: '已结束', description: '历史活动留档' },
];

const PAGE_SIZE = 20;

type LoadOptions = {
  reset?: boolean;
  keyword?: string;
  statusKey?: QuickFilterKey;
};

const fetchTotal = async (
  params: {
    keyword: string;
    status: string | null;
  },
): Promise<number> => {
  try {
    const res = await window.api.activities.list({
      page: 1,
      pageSize: 1,
      filter: {
        ...(params.keyword ? { keyword: params.keyword } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    });

    if (res.ok) {
      return res.data.total;
    }
    return 0;
  } catch (err) {
    console.error('[activities:list] failed to fetch total', err);
    return 0;
  }
};

const ActivitiesPage = () => {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilterKey>('all');
  const [totals, setTotals] = useState<Record<QuickFilterKey, number>>({ all: 0, open: 0, closed: 0 });
  const pageRef = useRef(1);

  const loadActivities = async ({ reset = false, keyword: kw, statusKey }: LoadOptions = {}) => {
    const targetPage = reset ? 1 : pageRef.current;
    const keywordValue = (kw ?? keyword).trim();
    const filterKey = statusKey ?? activeFilter;
    const statusMeta = QUICK_FILTERS.find((item) => item.key === filterKey) ?? QUICK_FILTERS[0];
    const statusValue = statusMeta.status;

    if (reset) {
      setLoading(true);
      if (targetPage === 1) {
        setActivities([]);
      }
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await window.api.activities.list({
        page: targetPage,
        pageSize: PAGE_SIZE,
        filter: {
          ...(keywordValue ? { keyword: keywordValue } : {}),
          ...(statusValue ? { status: statusValue } : {}),
        },
        sort: { date: -1 },
      });

      if (res.ok) {
        setActivities((prev) => (reset ? res.data.items : [...prev, ...res.data.items]));
        setError(null);
        const hasNext = res.data.items.length === PAGE_SIZE;
        setHasMore(hasNext);
        pageRef.current = hasNext ? targetPage + 1 : targetPage;
      } else {
        setError(res.error.msg);
        setHasMore(false);
      }

      if (reset) {
        const totalResults = await Promise.all(
          QUICK_FILTERS.map(async (filter) => {
            const total = await fetchTotal({ keyword: keywordValue, status: filter.status });
            return [filter.key, total] as const;
          }),
        );
        setTotals(Object.fromEntries(totalResults) as Record<QuickFilterKey, number>);
      }
    } catch (err) {
      console.error('Failed to load activities', err);
      setError('加载活动列表时出现异常');
      setHasMore(false);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadActivities({ reset: true, keyword: '', statusKey: 'all' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    pageRef.current = 1;
    loadActivities({ reset: true });
  };

  const handleReset = () => {
    setKeyword('');
    setActiveFilter('all');
    pageRef.current = 1;
    loadActivities({ reset: true, keyword: '', statusKey: 'all' });
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    loadActivities();
  };

  const handleQuickFilter = (key: QuickFilterKey) => {
    if (key === activeFilter) return;
    setActiveFilter(key);
    pageRef.current = 1;
    loadActivities({ reset: true, statusKey: key });
  };

  const quickFilters = useMemo(() => QUICK_FILTERS, []);

  return (
    <div className="page">
      <header className="page__header">
        <h1>活动列表</h1>
        <p>支持按关键字、状态筛选活动，快速查看当地活动进度</p>
      </header>

      <section className="card">
        <div className="card__header">
          <h2>活动检索</h2>
          <Link className="button" to="/activities/new">
            新增活动
          </Link>
        </div>

        <form className="filters" onSubmit={handleSubmit}>
          <div className="filters__inputs">
            <label className="filters__field">
              <span>关键字</span>
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="活动标题、简介关键词"
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
            <span className="filters__hint">共 {totals.all} 条活动记录。</span>
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
          <span>展示符合条件的活动，可进入详情查看参会信息</span>
        </header>

        {loading && activities.length === 0 ? (
          <div className="empty-state">正在加载活动列表…</div>
        ) : error ? (
          <div className="empty-state empty-state--error">加载失败：{error}</div>
        ) : activities.length === 0 ? (
          <div className="empty-state">
            暂无活动记录，试试调整筛选或新增活动。
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>日期</th>
                  <th>地点</th>
                  <th>状态</th>
                  <th>容量</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.title}</td>
                    <td>{activity.date || '待定'}</td>
                    <td>{activity.location ?? '待定'}</td>
                    <td>
                      <span className={`status-pill status-pill--${activity.status ?? 'unknown'}`}>
                        {activity.status ?? 'unknown'}
                      </span>
                    </td>
                    <td>{activity.capacity ?? '—'}</td>
                    <td>
                      <Link to={`/activities/${activity.id}`}>查看详情</Link>
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

export default ActivitiesPage;
