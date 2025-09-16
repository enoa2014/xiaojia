import { useEffect, useRef, useState } from 'react';
import type { RegistrationRecord } from '@shared/types/registrations';

const PAGE_SIZE = 20;

const RegistrationsPage = () => {
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [activityId, setActivityId] = useState('');
  const [status, setStatus] = useState('');
  const pageRef = useRef(1);

  const loadRegistrations = async ({ reset = false }: { reset?: boolean } = {}) => {
    const targetPage = reset ? 1 : pageRef.current;
    const filter = {
      ...(activityId.trim() ? { activityId: activityId.trim() } : {}),
      ...(status.trim() ? { status: status.trim() } : {}),
    };

    if (reset) {
      setLoading(true);
      if (targetPage === 1) setRecords([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await window.api.registrations.list({
        page: targetPage,
        pageSize: PAGE_SIZE,
        filter,
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
    } catch (err) {
      console.error('Failed to load registrations', err);
      setError('加载报名记录时发生异常');
      setHasMore(false);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadRegistrations({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    pageRef.current = 1;
    loadRegistrations({ reset: true });
  };

  const handleReset = () => {
    setActivityId('');
    setStatus('');
    pageRef.current = 1;
    loadRegistrations({ reset: true });
  };

  const handleLoadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    loadRegistrations();
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>报名记录</h1>
        <p>查看活动报名情况，可按活动与状态筛选。</p>
      </header>

      <section className="card">
        <form className="filters" onSubmit={handleSubmit}>
          <input
            type="text"
            value={activityId}
            onChange={(event) => setActivityId(event.target.value)}
            placeholder="活动 ID"
          />
          <input
            type="text"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            placeholder="状态（registered/waitlist/cancelled）"
          />
          <button type="submit" disabled={loading}>搜索</button>
          <button type="button" onClick={handleReset} disabled={loading}>重置</button>
        </form>

        {loading ? (
          <p>正在加载报名记录…</p>
        ) : error ? (
          <p style={{ color: '#d14343' }}>{error}</p>
        ) : records.length === 0 ? (
          <p>暂无报名数据。</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>活动ID</th>
                  <th>用户ID</th>
                  <th>状态</th>
                  <th>报名时间</th>
                  <th>签到时间</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.activityId}</td>
                    <td>{record.userId ?? '—'}</td>
                    <td>{record.status}</td>
                    <td>{record.registeredAt ? new Date(record.registeredAt).toLocaleString() : '—'}</td>
                    <td>{record.checkedInAt ? new Date(record.checkedInAt).toLocaleString() : '—'}</td>
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
