import { useEffect, useState } from "react";
import type { StatsHomeSummary, StatsSeriesResponse } from "@shared/types/stats";

const StatsPage = () => {
  const [summary, setSummary] = useState<StatsHomeSummary | null>(null);
  const [daily, setDaily] = useState<StatsSeriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [homeRes, dailyRes] = await Promise.all([
        window.api.stats.homeSummary(),
        window.api.stats.daily({
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
        }),
      ]);

      if (homeRes.ok) {
        setSummary(homeRes.data);
      } else {
        setError(homeRes.error.msg);
      }

      if (dailyRes.ok) {
        setDaily(dailyRes.data);
      }
    } catch (err) {
      console.error("load stats failed", err);
      setError("加载统计数据失败");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <header className="page__header">
        <h1>数据看板</h1>
      </header>
      {error ? <div className="form__error">{error}</div> : null}
      {summary ? (
        <section className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
          <div className="card__metric">
            <strong>{summary.patients}</strong>
            <span>患者总数</span>
          </div>
          <div className="card__metric">
            <strong>{summary.services}</strong>
            <span>服务记录</span>
          </div>
          <div className="card__metric">
            <strong>{summary.activities}</strong>
            <span>活动数量</span>
          </div>
          <div className="card__metric">
            <strong>{summary.tenancies}</strong>
            <span>住宿记录</span>
          </div>
        </section>
      ) : null}

      {daily && daily.points.length ? (
        <section className="card">
          <h2>最近 7 天入住次数</h2>
          <ul>
            {daily.points.map((point) => (
              <li key={point.label}>
                {point.label}: {point.value}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default StatsPage;
