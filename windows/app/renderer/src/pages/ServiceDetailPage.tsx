import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ServiceRecord } from "@shared/types/services";

const ServiceDetailPage = () => {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<ServiceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        const res = await window.api.services.get(params.id);
        if (res.ok) {
          setRecord(res.data);
        } else {
          setError(res.error.msg);
        }
      } catch (err) {
        console.error("load service failed", err);
        setError("读取记录失败");
      }
    };
    load();
  }, [params.id]);

  const handleReview = async (action: "approve" | "reject") => {
    if (!params.id) return;
    const reason = action === "reject" ? window.prompt("请输入驳回原因", "资料不完整") : undefined;
    if (action === "reject" && (!reason || reason.trim().length < 2)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await window.api.services.review({ id: params.id, action, reason: reason?.trim() });
      if (res.ok) {
        setRecord(res.data);
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error("review service failed", err);
      setError("审批失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) {
    return (
      <div className="page">
        <h1>服务详情</h1>
        {error ? <div className="form__error">{error}</div> : <div>正在加载…</div>}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>服务详情</h1>
      </header>
      <section className="card">
        <p>患者 ID：{record.patientId}</p>
        <p>类型：{record.type}</p>
        <p>日期：{record.date}</p>
        <p>状态：{record.status}</p>
        <p>创建人：{record.createdBy ?? "—"}</p>
        <p>描述：{record.description ?? "—"}</p>
        <p>图片：{record.images.length ? record.images.join(", ") : "—"}</p>
        {error ? <div className="form__error">{error}</div> : null}
        <div className="form__actions" style={{ gap: "8px" }}>
          <button type="button" onClick={() => handleReview("approve")} disabled={submitting}>
            审核通过
          </button>
          <button type="button" className="button button--secondary" onClick={() => handleReview("reject")} disabled={submitting}>
            驳回
          </button>
        </div>
      </section>
    </div>
  );
};

export default ServiceDetailPage;
