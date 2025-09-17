import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuditLogRecord } from '@shared/types/audits';

const ACTION_OPTIONS: Array<{ value: string; label: string; icon: string }> = [
  { value: 'all', label: '全部操作', icon: '📋' },
  { value: 'patients.readSensitive', label: '敏感信息访问', icon: '🔓' },
  { value: 'permissions.request.submit', label: '权限申请提交', icon: '📝' },
  { value: 'permissions.approve', label: '权限批准', icon: '✅' },
  { value: 'permissions.reject', label: '权限拒绝', icon: '❌' },
  { value: 'services.review', label: '服务记录审核', icon: '👀' },
  { value: 'exports.create', label: '数据导出创建', icon: '📤' },
  { value: 'exports.status', label: '导出状态查询', icon: '📊' },
];

const PAGE_SIZE = 20;
const DAY = 24 * 60 * 60 * 1000;

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const buildDefaultRange = () => {
  const now = new Date();
  const end = formatDateInput(now);
  const startDate = new Date(now.getTime() - 7 * DAY);
  return { start: formatDateInput(startDate), end };
};

const formatDateTime = (value: number) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  } catch (error) {
    console.warn('invalid audit timestamp', value, error);
    return '—';
  }
};

const maskIdentifier = (value: string) => {
  if (!value) return '***';
  if (value.length <= 4) return '***' + value;
  return '***' + value.slice(-4);
};

const describeAction = (action: string) => {
  const option = ACTION_OPTIONS.find((item) => item.value === action);
  return option ? option.label : action;
};

const iconForAction = (action: string) => {
  const option = ACTION_OPTIONS.find((item) => item.value === action);
  return option ? option.icon : '📌';
};

const describeTarget = (target: Record<string, unknown> | null) => {
  if (!target) return '—';
  const patientId = typeof target.patientId === 'string' ? target.patientId : null;
  const serviceId = typeof target.serviceId === 'string' ? target.serviceId : null;
  const requestId = typeof target.requestId === 'string' ? target.requestId : null;
  const taskId = typeof (target as { taskId?: string }).taskId === 'string' ? (target as { taskId?: string }).taskId : null;

  if (patientId) {
    return '患者 ID ' + maskIdentifier(patientId);
  }
  if (serviceId) {
    return '服务 ID ' + maskIdentifier(serviceId);
  }
  if (requestId) {
    return '申请 ID ' + maskIdentifier(requestId);
  }
  if (taskId) {
    return '任务 ID ' + maskIdentifier(taskId);
  }
  try {
    return JSON.stringify(target);
  } catch (error) {
    console.warn('无法序列化审计目标', target, error);
    return '—';
  }
};

const describeDetails = (details: Record<string, unknown> | null) => {
  if (!details) return null;
  try {
    return JSON.stringify(details);
  } catch (error) {
    console.warn('无法序列化审计详情', details, error);
    return null;
  }
};

const AuditLogsPage = () => {
  const defaultRange = useMemo(() => buildDefaultRange(), []);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [actorFilter, setActorFilter] = useState('');
  const pageRef = useRef(1);

  const buildFilterPayload = useCallback(() => {
    const filter: Record<string, unknown> = {};
    if (startDate) {
      filter.from = startDate;
    }
    if (endDate) {
      filter.to = endDate;
    }
    if (actionFilter !== 'all') {
      filter.action = actionFilter;
    }
    const actor = actorFilter.trim();
    if (actor) {
      filter.actorId = actor;
    }
    return Object.keys(filter).length ? filter : undefined;
  }, [actionFilter, actorFilter, startDate, endDate]);

  const loadLogs = useCallback(
    async (options: { reset?: boolean } = {}) => {
      const { reset = false } = options;
      if (loadingMore && !reset) {
        return;
      }
      if (loading && reset) {
        return;
      }

      const currentPage = reset ? 1 : pageRef.current;
      const payload: Record<string, unknown> = {
        page: currentPage,
        pageSize: PAGE_SIZE,
      };
      const filterPayload = buildFilterPayload();
      if (filterPayload) {
        payload.filter = filterPayload;
      }

      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await window.api.audits.list(payload);
        if (res.ok) {
          const items = res.data.items || [];
          setTotal(res.data.total ?? items.length);
          setLogs((prev) => (reset ? items : prev.concat(items)));
          setError(null);

          const totalRecords = res.data.total ?? items.length;
          const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / PAGE_SIZE) : 0;
          const hasNext = currentPage < totalPages;
          setHasMore(hasNext);
          pageRef.current = hasNext ? currentPage + 1 : currentPage;
        } else {
          setError(res.error.msg || '加载失败，请稍后重试。');
          if (reset) {
            setLogs([]);
            setTotal(0);
          }
          setHasMore(false);
        }
      } catch (err) {
        console.error('加载审计日志失败', err);
        setError('加载审计日志时发生异常，请稍候重试。');
        if (reset) {
          setLogs([]);
          setTotal(0);
        }
        setHasMore(false);
      } finally {
        if (reset) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [buildFilterPayload, loading, loadingMore],
  );

  useEffect(() => {
    loadLogs({ reset: true });
  }, [loadLogs]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startDate && endDate && startDate > endDate) {
      setError('开始日期不能晚于结束日期');
      return;
    }
    pageRef.current = 1;
    loadLogs({ reset: true });
  };

  const handleResetFilters = () => {
    setActionFilter('all');
    setActorFilter('');
    setStartDate(defaultRange.start);
    setEndDate(defaultRange.end);
    setError(null);
    pageRef.current = 1;
    window.setTimeout(() => {
      loadLogs({ reset: true });
    }, 0);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    loadLogs({ reset: false });
  };

  const renderActionCell = (log: AuditLogRecord) => (
    <span>
      <span role="img" aria-hidden="true">
        {iconForAction(log.action)}
      </span>
      {' '}
      {describeAction(log.action)}
    </span>
  );

  const renderTargetCell = (log: AuditLogRecord) => {
    const targetText = describeTarget(log.target);
    const patientId = log.target && typeof log.target.patientId === 'string' ? log.target.patientId : null;
    if (patientId) {
      return <Link to={'/patients/' + patientId}>{targetText}</Link>;
    }
    return targetText;
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>审计日志</h1>
        <p>追踪敏感数据访问与关键操作，支持按时间、操作类型和操作人筛选。</p>
      </header>

      <section className="card">
        <form className="filters" onSubmit={handleSubmit}>
          <label>
            操作类型
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon + ' ' + option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            开始日期
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            结束日期
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label>
            操作人
            <input
              type="text"
              value={actorFilter}
              onChange={(event) => setActorFilter(event.target.value)}
              placeholder="输入用户 ID"
            />
          </label>
          <div className="filters__actions">
            <button type="submit" disabled={loading}>
              查询
            </button>
            <button type="button" className="button button--secondary" onClick={handleResetFilters} disabled={loading}>
              重置
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card__header">
          <h2>日志列表</h2>
          <span className="card__meta">共 {total} 条记录</span>
          <button type="button" className="button button--ghost" onClick={() => loadLogs({ reset: true })} disabled={loading}>
            刷新
          </button>
        </div>

        {error ? <div className="form__error">{error}</div> : null}
        {loading && logs.length === 0 ? <div className="empty-state">正在加载审计日志…</div> : null}
        {!loading && logs.length === 0 && !error ? <div className="empty-state">最近没有符合条件的审计记录。</div> : null}

        {logs.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作</th>
                <th>操作人</th>
                <th>目标</th>
                <th>请求号</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const detailsText = describeDetails(log.details);
                return (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{renderActionCell(log)}</td>
                    <td>{log.actorId || '—'}</td>
                    <td>{renderTargetCell(log)}</td>
                    <td>{log.requestId || '—'}</td>
                    <td>{detailsText || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {hasMore ? (
          <div className="table__footer">
            <button type="button" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? '加载中…' : '加载更多'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AuditLogsPage;
