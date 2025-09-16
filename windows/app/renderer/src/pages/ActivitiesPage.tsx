import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityRecord } from '@shared/types/activities';

const PAGE_SIZE = 20;

type LoadOptions = {
  reset?: boolean;
  keyword?: string;
  status?: string;
};

const ActivitiesPage = () => {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const pageRef = useRef(1);

  const loadActivities = async ({ reset = false, keyword: kw, status: st }: LoadOptions = {}) => {
    const targetPage = reset ? 1 : pageRef.current;
    const keywordValue = (kw ?? keyword).trim();
    const statusValue = (st ?? status).trim();

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
    } catch (err) {
      console.error('Failed to load activities', err);
      setError('加载活动列表时发生异常');
      setHasMore(false);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadActivities({ reset: true, keyword: '', status: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    pageRef.current = 1;
    loadActivities({ reset: true });
  };

  const handleReset = () => {
    setKeyword('');
    setStatus('');
    pageRef.current = 1;
    loadActivities({ reset: true, keyword: '', status: '' });
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    loadActivities();
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>活动列表</h1>
        <p>查看与搜索近期活动，支持关键字与状态筛选。</p>
      </header>

      <section className="card">
        <div className="card__header">
          <h2>活动概览</h2>
          <Link className="button" to="/activities/new">
            新增活动
          </Link>
        </div>

        <form className="filters" onSubmit={handleSubmit}>
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="活动标题/描述关键字"
          />
          <input
            type="text"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            placeholder="状态（如 open/closed）"
          />
          <button type="submit" disabled={loading}>搜索</button>
          <button type="button" onClick={handleReset} disabled={loading}>重置</button>
        </form>

        {loading ? (
          <p>正在加载活动列表…</p>
        ) : error ? (
          <p style={{ color: '#d14343' }}>{error}</p>
        ) : activities.length === 0 ? (
          <p>暂无活动记录。</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>日期</th>
                  <th>地点</th>
                  <th>状态</th>
                  <th>容量</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.title}</td>
                    <td>{activity.date}</td>
                    <td>{activity.location ?? '—'}</td>
                    <td>{activity.status}</td>
                    <td>{activity.capacity ?? '不限'}</td>
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
