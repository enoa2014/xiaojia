import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ServiceFormPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientId: "",
    type: "陪护",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    images: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        patientId: form.patientId.trim(),
        type: form.type.trim() || "其他",
        date: form.date,
        description: form.description.trim() || null,
        images: form.images
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      const res = await window.api.services.create(payload);
      if (res.ok) {
        navigate(`/services/${res.data.id}`);
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error("create service failed", err);
      setError("保存失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>新增服务记录</h1>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>患者 ID</span>
          <input value={form.patientId} onChange={(event) => handleChange("patientId", event.target.value)} required />
        </label>
        <label className="form__field">
          <span>服务类型</span>
          <input value={form.type} onChange={(event) => handleChange("type", event.target.value)} required />
        </label>
        <label className="form__field">
          <span>服务日期</span>
          <input type="date" value={form.date} onChange={(event) => handleChange("date", event.target.value)} required />
        </label>
        <label className="form__field">
          <span>描述</span>
          <textarea value={form.description} onChange={(event) => handleChange("description", event.target.value)} />
        </label>
        <label className="form__field">
          <span>图片（逗号分隔）</span>
          <input value={form.images} onChange={(event) => handleChange("images", event.target.value)} />
        </label>
        {error ? <div className="form__error">{error}</div> : null}
        <div className="form__actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "提交中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceFormPage;
