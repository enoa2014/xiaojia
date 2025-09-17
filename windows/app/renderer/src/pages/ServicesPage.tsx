import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ServiceRecord } from "@shared/types/services";

const ServicesPage = () => {
  const [items, setItems] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.services.list({ page: 1, pageSize: 50 });
      if (res.ok) {
        setItems(res.data.items);
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error("load services failed", err);
      setError("加载服务记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  return (
    <div className="page">
      <header className="page__header">
        <h1>服务记录</h1>
        <div className="page__actions">
          <Link to="/services/new" className="button">
            新建记录
          </Link>
        </div>
      </header>
      {error ? <div className="form__error">{error}</div> : null}
      {loading ? <div>正在加载服务记录…</div> : null}
      {!loading && !error ? (
        <table className="table">
          <thead>
            <tr>
              <th>患者 ID</th>
              <th>类型</th>
              <th>日期</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.patientId}</td>
                <td>{item.type}</td>
                <td>{item.date}</td>
                <td>{item.status}</td>
                <td>
                  <Link to={`/services/${item.id}`}>查看</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
};

export default ServicesPage;
