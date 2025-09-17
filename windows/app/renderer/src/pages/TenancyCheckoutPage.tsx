import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { TenancyRecord } from "@shared/types/tenancies";

const TenancyCheckoutPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<TenancyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        const res = await window.api.tenancies.get(params.id);
        if (res.ok) {
          setRecord(res.data);
        } else {
          setError(res.error.msg);
        }
      } catch (err) {
        console.error("load tenancy failed", err);
        setError("读取记录失败");
      }
    };
    load();
  }, [params.id]);

  const handleCheckout = async () => {
    if (!record) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await window.api.tenancies.update({
        id: record.id,
        patch: { checkOutDate: new Date().toISOString().slice(0, 10) },
      });
      if (res.ok) {
        navigate("/tenancies");
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error("checkout failed", err);
      setError("退住失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) {
    return (
      <div className="page">
        <h1>退住</h1>
        {error ? <div className="form__error">{error}</div> : <div>正在加载…</div>}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>退住确认</h1>
      </header>
      <section className="card">
        <p>患者 ID：{record.patientId ?? "—"}</p>
        <p>入住日期：{record.checkInDate}</p>
        <p>当前状态：{record.checkOutDate ? `已退住（${record.checkOutDate}）` : "在住"}</p>
        {error ? <div className="form__error">{error}</div> : null}
        <div className="form__actions">
          <button type="button" onClick={handleCheckout} disabled={submitting || !!record.checkOutDate}>
            {record.checkOutDate ? "已完成" : submitting ? "处理中…" : "退住"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default TenancyCheckoutPage;
