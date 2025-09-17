import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { TenancyRecord } from "@shared/types/tenancies";

const TenanciesPage = () => {
  const [items, setItems] = useState<TenancyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTenancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.tenancies.list({ page: 1, pageSize: 50 });
      if (res.ok) {
        setItems(res.data.items);
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error("load tenancies failed", err);
      setError("加载住宿记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenancies();
  }, []);

  return (
    <div className="page">
      <header className="page__header">
        <h1>住宿记录</h1>
        <div className="page__actions">
          <Link to="/tenancies/new" className="button">
            新建住宿
          </Link>
        </div>
      </header>

      {error ? <div className="form__error">{error}</div> : null}
      {loading ? <div>正在加载住宿数据…</div> : null}

      {!loading && !error ? (
        <table className="table">
          <thead>
            <tr>
              <th>患者 ID</th>
              <th>入住日期</th>
              <th>退住日期</th>
              <th>房间</th>
              <th>床位</th>
              <th>补贴</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.patientId ?? "—"}</td>
                <td>{item.checkInDate}</td>
                <td>{item.checkOutDate ?? "在住"}</td>
                <td>{item.room ?? "—"}</td>
                <td>{item.bed ?? "—"}</td>
                <td>{item.subsidy == null ? "—" : item.subsidy}</td>
                <td>
                  <Link to={`/tenancies/${item.id}/checkout`}>退住</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
};

export default TenanciesPage;
