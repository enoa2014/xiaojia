import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TenancyFormPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientId: "",
    idCard: "",
    checkInDate: new Date().toISOString().slice(0, 10),
    room: "",
    bed: "",
    subsidy: "",
    extra: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        idCard: form.idCard.trim() || null,
        checkInDate: form.checkInDate,
        room: form.room.trim() || null,
        bed: form.bed.trim() || null,
        subsidy: form.subsidy ? Number(form.subsidy) : null,
        extra: form.extra.trim() || null,
      };
      const res = await window.api.tenancies.create(payload);
      if (res.ok) {
        navigate(`/tenancies/${res.data.id}/checkout`);
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error("create tenancy failed", err);
      setError("创建失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>新增住宿记录</h1>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>患者 ID</span>
          <input value={form.patientId} onChange={(event) => handleChange("patientId", event.target.value)} required />
        </label>
        <label className="form__field">
          <span>身份证号</span>
          <input value={form.idCard} onChange={(event) => handleChange("idCard", event.target.value)} />
        </label>
        <label className="form__field">
          <span>入住日期</span>
          <input type="date" value={form.checkInDate} onChange={(event) => handleChange("checkInDate", event.target.value)} required />
        </label>
        <label className="form__field">
          <span>房间</span>
          <input value={form.room} onChange={(event) => handleChange("room", event.target.value)} />
        </label>
        <label className="form__field">
          <span>床位</span>
          <input value={form.bed} onChange={(event) => handleChange("bed", event.target.value)} />
        </label>
        <label className="form__field">
          <span>补贴金额</span>
          <input value={form.subsidy} onChange={(event) => handleChange("subsidy", event.target.value)} />
        </label>
        <label className="form__field">
          <span>备注</span>
          <textarea value={form.extra} onChange={(event) => handleChange("extra", event.target.value)} />
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

export default TenancyFormPage;
