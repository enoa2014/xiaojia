import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StatsDailyRequest, StatsHomeSummary, StatsSeriesResponse } from '@shared/types/stats';

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const clampDate = (value: string): string => {
  if (!value) return '';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return '';
  return formatDate(new Date(parsed));
};

const buildDailyRequest = ({ from, to }: { from: string; to: string }): StatsDailyRequest => ({
  from,
  to,
});

const WEEK_COUNT_OPTIONS = [12, 26, 52];
const YEAR_RANGE_OPTIONS = [3, 5, 10];

const StatsPage = () => {
  const today = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => formatDate(today), [today]);
  const defaultFrom = useMemo(() => {
    const temp = new Date(today.getTime());
    temp.setDate(temp.getDate() - 6);
    return formatDate(temp);
  }, [today]);

  const currentYear = today.getFullYear();
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let year = currentYear; year >= currentYear - 5; year -= 1) {
      list.push(year);
    }
    return list;
  }, [currentYear]);

  const [summary, setSummary] = useState<StatsHomeSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [dailyRange, setDailyRange] = useState<{ from: string; to: string }>({ from: defaultFrom, to: defaultTo });
  const [dailyData, setDailyData] = useState<StatsSeriesResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [weeklyYear, setWeeklyYear] = useState(currentYear);
  const [weeklyWeeks, setWeeklyWeeks] = useState<number>(WEEK_COUNT_OPTIONS[0]);
  const [weeklyData, setWeeklyData] = useState<StatsSeriesResponse | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const [monthlyYear, setMonthlyYear] = useState(currentYear);
  const [monthlyData, setMonthlyData] = useState<StatsSeriesResponse | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  const [yearlySpan, setYearlySpan] = useState<number>(YEAR_RANGE_OPTIONS[0]);
  const [yearlyData, setYearlyData] = useState<StatsSeriesResponse | null>(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyError, setYearlyError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await window.api.stats.homeSummary();
      if (res.ok) {
        setSummary(res.data);
      } else {
        setSummaryError(res.error.msg || '统计概要加载失败');
      }
    } catch (error) {
      console.error('load stats summary failed', error);
      setSummaryError('统计概要加载失败');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadDaily = useCallback(
    async (range: { from: string; to: string }) => {
      setDailyLoading(true);
      setDailyError(null);
      try {
        const payload = buildDailyRequest(range);
        const res = await window.api.stats.daily(payload);
        if (res.ok) {
          setDailyData(res.data);
        } else {
          setDailyError(res.error.msg || '近7天入住统计加载失败');
        }
      } catch (error) {
        console.error('load stats daily failed', error);
        setDailyError('近7天入住统计加载失败');
      } finally {
        setDailyLoading(false);
      }
    },
    [],
  );

  const loadWeekly = useCallback(
    async (year: number, weeks: number) => {
      setWeeklyLoading(true);
      setWeeklyError(null);
      try {
        const res = await window.api.stats.weekly({ year, weeks });
        if (res.ok) {
          setWeeklyData(res.data);
        } else {
          setWeeklyError(res.error.msg || '服务周度统计加载失败');
        }
      } catch (error) {
        console.error('load stats weekly failed', error);
        setWeeklyError('服务周度统计加载失败');
      } finally {
        setWeeklyLoading(false);
      }
    },
    [],
  );

  const loadMonthly = useCallback(
    async (year: number) => {
      setMonthlyLoading(true);
      setMonthlyError(null);
      try {
        const res = await window.api.stats.monthly({ year });
        if (res.ok) {
          setMonthlyData(res.data);
        } else {
          setMonthlyError(res.error.msg || '患者月度统计加载失败');
        }
      } catch (error) {
        console.error('load stats monthly failed', error);
        setMonthlyError('患者月度统计加载失败');
      } finally {
        setMonthlyLoading(false);
      }
    },
    [],
  );

  const loadYearly = useCallback(
    async (years: number) => {
      setYearlyLoading(true);
      setYearlyError(null);
      try {
        const res = await window.api.stats.yearly({ years });
        if (res.ok) {
          setYearlyData(res.data);
        } else {
          setYearlyError(res.error.msg || '活动年度统计加载失败');
        }
      } catch (error) {
        console.error('load stats yearly failed', error);
        setYearlyError('活动年度统计加载失败');
      } finally {
        setYearlyLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadSummary();
    loadDaily(dailyRange);
    loadWeekly(weeklyYear, weeklyWeeks);
    loadMonthly(monthlyYear);
    loadYearly(yearlySpan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDailySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dailyRange.from || !dailyRange.to) {
      setDailyError('请选择完整的起止日期');
      return;
    }
    if (Date.parse(dailyRange.from) > Date.parse(dailyRange.to)) {
      setDailyError('开始日期应不晚于结束日期');
      return;
    }
    loadDaily(dailyRange);
  };

  const renderSeriesTable = (data: StatsSeriesResponse | null, emptyText: string) => {
    if (!data || !data.points.length) {
      return <div className="stats-empty">{emptyText}</div>;
    }
    return (
      <table className="stats-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>数量</th>
          </tr>
        </thead>
        <tbody>
          {data.points.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td>{point.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="page stats">
      <header className="page__header">
        <h1>数据看板</h1>
        <p>了解桌面端本地数据的整体规模与趋势，支持按维度分别查看。</p>
      </header>

      <section className="card stats-summary">
        <div className="card__header">
          <h2>基础概览</h2>
          <button type="button" className="button button--secondary" onClick={loadSummary} disabled={summaryLoading}>
            {summaryLoading ? '刷新中…' : '刷新'}
          </button>
        </div>
        {summaryError ? <div className="stats-error">{summaryError}</div> : null}
        <div className="stats-summary__grid">
          <div className="stats-summary__item">
            <span className="stats-summary__label">患者档案</span>
            <strong className="stats-summary__value">{summary?.patients?.toLocaleString() ?? '—'}</strong>
            <span className="stats-summary__desc">当前存量</span>
          </div>
          <div className="stats-summary__item">
            <span className="stats-summary__label">服务记录</span>
            <strong className="stats-summary__value">{summary?.services?.toLocaleString() ?? '—'}</strong>
            <span className="stats-summary__desc">包含待审核、已通过</span>
          </div>
          <div className="stats-summary__item">
            <span className="stats-summary__label">线下活动</span>
            <strong className="stats-summary__value">{summary?.activities?.toLocaleString() ?? '—'}</strong>
            <span className="stats-summary__desc">活动管理模块</span>
          </div>
          <div className="stats-summary__item">
            <span className="stats-summary__label">安置记录</span>
            <strong className="stats-summary__value">{summary?.tenancies?.toLocaleString() ?? '—'}</strong>
            <span className="stats-summary__desc">入住/续租统计</span>
          </div>
        </div>
      </section>

      <section className="card stats-section">
        <div className="card__header">
          <div>
            <h2>近期开住趋势</h2>
            <span className="card__meta">基于安置记录的入住次数统计</span>
          </div>
          <form className="stats-filters" onSubmit={handleDailySubmit}>
            <label>
              开始
              <input
                type="date"
                value={dailyRange.from}
                onChange={(event) => setDailyRange((prev) => ({ ...prev, from: clampDate(event.target.value) }))}
              />
            </label>
            <label>
              结束
              <input
                type="date"
                value={dailyRange.to}
                onChange={(event) => setDailyRange((prev) => ({ ...prev, to: clampDate(event.target.value) }))}
              />
            </label>
            <button type="submit" className="button button--secondary" disabled={dailyLoading}>
              {dailyLoading ? '加载中…' : '更新'}
            </button>
          </form>
        </div>
        {dailyError ? <div className="stats-error">{dailyError}</div> : null}
        {dailyLoading && !dailyData ? (
          <div className="stats-empty">加载中…</div>
        ) : (
          renderSeriesTable(dailyData, '暂无入住数据')
        )}
      </section>

      <section className="card stats-section">
        <div className="card__header">
          <div>
            <h2>服务周度统计</h2>
            <span className="card__meta">按周查看服务提交数量</span>
          </div>
          <div className="stats-filters">
            <label>
              年份
              <select
                value={weeklyYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setWeeklyYear(nextYear);
                  loadWeekly(nextYear, weeklyWeeks);
                }}
              >
                {yearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item} 年
                  </option>
                ))}
              </select>
            </label>
            <label>
              周数
              <select
                value={weeklyWeeks}
                onChange={(event) => {
                  const nextWeeks = Number(event.target.value);
                  setWeeklyWeeks(nextWeeks);
                  loadWeekly(weeklyYear, nextWeeks);
                }}
              >
                {WEEK_COUNT_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    最近 {item} 周
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {weeklyError ? <div className="stats-error">{weeklyError}</div> : null}
        {weeklyLoading && !weeklyData ? (
          <div className="stats-empty">加载中…</div>
        ) : (
          renderSeriesTable(weeklyData, '暂无服务数据')
        )}
      </section>

      <section className="card stats-section">
        <div className="card__header">
          <div>
            <h2>患者月度趋势</h2>
            <span className="card__meta">统计当年新增患者档案</span>
          </div>
          <div className="stats-filters">
            <label>
              年份
              <select
                value={monthlyYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setMonthlyYear(nextYear);
                  loadMonthly(nextYear);
                }}
              >
                {yearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item} 年
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {monthlyError ? <div className="stats-error">{monthlyError}</div> : null}
        {monthlyLoading && !monthlyData ? (
          <div className="stats-empty">加载中…</div>
        ) : (
          renderSeriesTable(monthlyData, '暂无患者统计数据')
        )}
      </section>

      <section className="card stats-section">
        <div className="card__header">
          <div>
            <h2>活动年度统计</h2>
            <span className="card__meta">回顾历史活动记录</span>
          </div>
          <div className="stats-filters">
            <label>
              年度范围
              <select
                value={yearlySpan}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setYearlySpan(next);
                  loadYearly(next);
                }}
              >
                {YEAR_RANGE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    最近 {item} 年
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {yearlyError ? <div className="stats-error">{yearlyError}</div> : null}
        {yearlyLoading && !yearlyData ? (
          <div className="stats-empty">加载中…</div>
        ) : (
          renderSeriesTable(yearlyData, '暂无活动统计数据')
        )}
      </section>
    </div>
  );
};

export default StatsPage;
