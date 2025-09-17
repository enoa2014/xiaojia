import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PatientRecord } from '@shared/types/patients';

const PAGE_SIZE = 20;
const RECENT_THRESHOLD_DAYS = 30;

type QuickFilterKey = 'all' | 'recent' | 'noIdCard';

type QuickFilterMeta = {
  key: QuickFilterKey;
  label: string;
  description: string;
};

const QUICK_FILTERS: QuickFilterMeta[] = [
  { key: 'all', label: '全部', description: '显示当前查询条件下的所有患者' },
  { key: 'recent', label: '30天内新增', description: '最近创建的患者档案，便于快速回访' },
  { key: 'noIdCard', label: '缺少证件号', description: '身份证未录入，需补全资料' },
];

type PatientsQuery = {
  reset?: boolean;
};

const parseDateToTimestamp = (value: string): number | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.setHours(0, 0, 0, 0);
};

const formatDateTime = (value: number) => {
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    console.warn('Invalid date value:', value, err);
    return '-';
  }
};

const PatientsPage = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchName, setSearchName] = useState('');
  const [searchTail, setSearchTail] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilterKey>('all');
  const pageRef = useRef(1);

  const loadPatients = async ({ reset = false }: PatientsQuery = {}) => {
    const nextPage = reset ? 1 : pageRef.current;
    const fromTs = parseDateToTimestamp(fromDate);
    const toTs = parseDateToTimestamp(toDate);
    const filterPayload = {
      ...(searchName.trim() ? { name: searchName.trim() } : {}),
      ...(searchTail.trim() ? { id_card_tail: searchTail.trim() } : {}),
      ...(fromTs !== undefined ? { createdFrom: fromTs } : {}),
      ...(toTs !== undefined ? { createdTo: toTs } : {}),
    };

    if (reset) {
      setLoading(true);
      if (nextPage === 1) {
        setPatients([]);
      }
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await window.api.patients.list({
        page: nextPage,
        pageSize: PAGE_SIZE,
        filter: Object.keys(filterPayload).length ? filterPayload : undefined,
        sort: { createdAt: -1 },
      });

      if (res.ok) {
        const items = res.data.items;
        setPatients((prev) => (reset ? items : [...prev, ...items]));
        setError(null);
        setTotal(res.data.total);
        const hasNext = items.length === PAGE_SIZE;
        setHasMore(hasNext);
        pageRef.current = hasNext ? nextPage + 1 : nextPage;
      } else {
        setError(res.error.msg);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load patients', err);
      setError('加载患者列表时出现异常');
      setHasMore(false);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPatients({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const derivedLists = useMemo(() => {
    const now = Date.now();
    const threshold = now - RECENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    const recent = patients.filter((item) => item.createdAt >= threshold);
    const noId = patients.filter((item) => !item.idCard || !item.idCard.trim());

    return {
      all: patients,
      recent,
      noIdCard: noId,
    } satisfies Record<QuickFilterKey, PatientRecord[]>;
  }, [patients]);

  const displayedPatients = derivedLists[activeFilter];

  const quickFilterCounts = useMemo(() => ({
    all: derivedLists.all.length,
    recent: derivedLists.recent.length,
    noIdCard: derivedLists.noIdCard.length,
  }), [derivedLists]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    pageRef.current = 1;
    loadPatients({ reset: true });
  };

  const handleReset = () => {
    setSearchName('');
    setSearchTail('');
    setFromDate('');
    setToDate('');
    pageRef.current = 1;
    loadPatients({ reset: true });
  };

  const handleLoadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    loadPatients({ reset: false });
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>患者档案</h1>
        <p>支持按姓名、身份证后四位及创建日期筛选，快速定位桌面端患者记录。</p>
      </header>

      <section className="card">
        <form className="form" onSubmit={handleSubmit}>
          <div className="form__row">
            <label className="form__field">
              <span>姓名</span>
              <input
                type="text"
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                placeholder="输入前缀，例如“张”"
              />
            </label>
            <label className="form__field">
              <span>身份证后四位</span>
              <input
                type="text"
                value={searchTail}
                onChange={(event) => setSearchTail(event.target.value)}
                maxLength={4}
                placeholder="1234"
              />
            </label>
          </div>

          <div className="form__row">
            <label className="form__field">
              <span>创建时间（起）</span>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label className="form__field">
              <span>创建时间（止）</span>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
          </div>

          <div className="form__actions">
            <button type="submit" disabled={loading}>
              {loading ? '查询中…' : '查询'}
            </button>
            <button type="button" className="button button--secondary" onClick={handleReset} disabled={loading}>
              重置条件
            </button>
            <span className="form__hint">当前共 {total} 条记录，已加载 {patients.length} 条。</span>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="quick-filters">
          {QUICK_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`quick-filters__item${activeFilter === item.key ? ' quick-filters__item--active' : ''}`}
              onClick={() => setActiveFilter(item.key)}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
              <span className="quick-filters__count">{quickFilterCounts[item.key]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <header className="card__header">
          <h2>列表</h2>
          <span>展示符合条件的患者档案，可点击查看详情</span>
        </header>

        {error ? (
          <div className="empty-state empty-state--error">
            <p>加载失败：{error}</p>
            <button type="button" onClick={() => loadPatients({ reset: true })}>
              重新加载
            </button>
          </div>
        ) : null}

        {!error && !loading && displayedPatients.length === 0 ? (
          <div className="empty-state">
            <p>暂无数据，试试修改筛选条件。</p>
            <button type="button" onClick={() => loadPatients({ reset: true })}>重新加载</button>
          </div>
        ) : null}

        <ul className="list">
          {displayedPatients.map((patient) => (
            <li key={patient.id} className="list__item">
              <div className="list__item-main">
                <h3>{patient.name || '未命名患者'}</h3>
                <p>
                  创建时间：{formatDateTime(patient.createdAt)} · 最近更新：{formatDateTime(patient.updatedAt)}
                </p>
                <p className="list__meta">
                  {patient.idCardTail ? `证件尾号 ${patient.idCardTail}` : '证件号待补录'} ·{' '}
                  {patient.phone ? `联系电话 ${patient.phone}` : '联系电话未录入'}
                </p>
              </div>
              <div className="list__item-actions">
                <Link className="button" to={`/patients/${patient.id}`}>
                  查看详情
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {hasMore ? (
          <div className="list__load-more">
            <button type="button" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? '加载中…' : '加载更多'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default PatientsPage;
