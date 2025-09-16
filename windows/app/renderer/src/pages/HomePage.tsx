import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PatientRecord } from '@shared/types/patients';

const PAGE_SIZE = 20;

type LoadOptions = {
  reset?: boolean;
  filters?: { name: string; tail: string };
};

const HomePage = () => {
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchTail, setSearchTail] = useState('');
  const pageRef = useRef(1);

  const loadPatients = async ({ reset = false, filters }: LoadOptions = {}) => {
    const nameValue = (filters?.name ?? searchName).trim();
    const tailValue = (filters?.tail ?? searchTail).trim();
    const targetPage = reset ? 1 : pageRef.current;

    if (reset) {
      setLoading(true);
      if (targetPage === 1) {
        setPatients([]);
      }
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await window.api.patients.list({
        page: targetPage,
        pageSize: PAGE_SIZE,
        filter: {
          ...(nameValue ? { name: nameValue } : {}),
          ...(tailValue ? { id_card_tail: tailValue } : {}),
        },
      });

      if (res.ok) {
        setPatients((prev) => (reset ? res.data.items : [...prev, ...res.data.items]));
        setPatientsError(null);
        const hasNext = res.data.items.length === PAGE_SIZE;
        setHasMore(hasNext);
        pageRef.current = hasNext ? targetPage + 1 : targetPage;
      } else {
        setPatientsError(res.error.msg);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load patients list', err);
      setPatientsError('加载患者列表时发生异常');
      setHasMore(false);
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const stored = await window.api.getMeta('last-opened');
        setLastOpened(stored);
        await window.api.setMeta('last-opened', new Date().toISOString());
      } catch (err) {
        console.error('Failed to read/write meta table', err);
      }
    };

    loadMeta();
    loadPatients({ reset: true, filters: { name: '', tail: '' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    pageRef.current = 1;
    loadPatients({ reset: true });
  };

  const handleResetFilters = () => {
    setSearchName('');
    setSearchTail('');
    pageRef.current = 1;
    loadPatients({ reset: true, filters: { name: '', tail: '' } });
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    loadPatients({ reset: false });
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>小家桌面端</h1>
        <p>此窗口用于验证桌面壳与 SQLite 数据通道是否正常工作。</p>
      </header>

      <section className="card">
        <h2>最近一次打开</h2>
        <p>{lastOpened ? new Date(lastOpened).toLocaleString() : '首次启动或尚未记录'}</p>
      </section>

      <section className="card">
        <div className="card__header">
          <h2>患者概览</h2>
          <Link className="button" to="/patients/new">
            新增患者
          </Link>
        </div>

        <form className="filters" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchName}
            onChange={(event) => setSearchName(event.target.value)}
            placeholder="按姓名前缀搜索"
          />
          <input
            type="text"
            value={searchTail}
            onChange={(event) => setSearchTail(event.target.value)}
            placeholder="身份证尾号"
          />
          <button type="submit" disabled={loading}>搜索</button>
          <button type="button" onClick={handleResetFilters} disabled={loading}>重置</button>
        </form>

        {loading ? (
          <p>正在读取患者列表…</p>
        ) : patientsError ? (
          <p style={{ color: '#d14343' }}>{patientsError}</p>
        ) : patients.length === 0 ? (
          <p>尚未录入患者信息。</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>身份证尾号</th>
                  <th>联系电话</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.name}</td>
                    <td>{patient.idCardTail ?? '—'}</td>
                    <td>{patient.phone ?? '—'}</td>
                    <td>{new Date(patient.createdAt).toLocaleString()}</td>
                    <td>
                      <Link to={`/patients/${patient.id}`}>查看详情</Link>
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

      <section className="card">
        <h2>下一步行动</h2>
        <ul>
          <li>将患者详情、编辑能力迁移到桌面端页面。</li>
          <li>继续接入活动、报名等业务模块的仓储与 IPC。</li>
          <li>完善主题与样式，复用现有设计 Tokens。</li>
        </ul>
      </section>
    </div>
  );
};

export default HomePage;
