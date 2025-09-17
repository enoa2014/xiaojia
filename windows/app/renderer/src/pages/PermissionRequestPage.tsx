import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PermissionField } from '@shared/types/permissions';

const FIELD_OPTIONS: Array<{ key: PermissionField; label: string; description: string }> = [
  { key: 'id_card', label: '证件信息', description: '身份证号及尾号' },
  { key: 'phone', label: '联系方式', description: '预留手机号' },
  { key: 'diagnosis', label: '病历摘要', description: '诊断与治疗关键信息' },
];

const EXPIRES_OPTIONS = [30, 60, 90];

const PermissionRequestPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') ?? '';

  const [patientId, setPatientId] = useState(initialPatientId);
  const [selectedFields, setSelectedFields] = useState<Record<PermissionField, boolean>>({
    id_card: false,
    phone: false,
    diagnosis: false,
  });
  const [reason, setReason] = useState('');
  const [expiresIndex, setExpiresIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const expiresDays = EXPIRES_OPTIONS[expiresIndex];

  const selectedList = useMemo(
    () => FIELD_OPTIONS.filter((item) => selectedFields[item.key]).map((item) => item.key),
    [selectedFields]
  );

  const toggleField = (field: PermissionField) => {
    setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!patientId.trim()) {
      nextErrors.patientId = '请填写患者 ID';
    }
    if (selectedList.length === 0) {
      nextErrors.fields = '请至少选择一项资料';
    }
    if (reason.trim().length < 20) {
      nextErrors.reason = '申请理由不少于 20 个字';
    }
    setErrorMap(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSuccessMessage(null);
      const payload = {
        patientId: patientId.trim(),
        fields: selectedList,
        reason: reason.trim(),
        expiresDays,
      };
      const response = await window.api.permissionRequests.create(payload);
      if (response.ok) {
        setSuccessMessage('申请已提交，等待审核。');
        setTimeout(() => {
          if (initialPatientId) {
            navigate(`/patients/${initialPatientId}`);
          }
        }, 800);
      } else {
        setErrorMap({ form: response.error.msg });
      }
    } catch (err) {
      console.error('submit permission request failed', err);
      setErrorMap({ form: '提交失败，请稍后再试。' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>资料查看申请</h1>
        <p>如需查看患者敏感资料，请提交申请并说明用途。</p>
      </header>

      <section className="card">
        <form className="form" onSubmit={handleSubmit}>
          <div className="form__field">
            <label htmlFor="patient-id">患者 ID</label>
            <input
              id="patient-id"
              type="text"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              placeholder="例如：seed-patient-001"
              disabled={Boolean(initialPatientId)}
            />
            {errorMap.patientId ? <span className="form__error">{errorMap.patientId}</span> : null}
          </div>

          <div className="permission-fields">
            <span className="permission-fields__label">申请资料</span>
            {errorMap.fields ? <span className="form__error">{errorMap.fields}</span> : null}
            <div className="permission-fields__grid">
              {FIELD_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={selectedFields[item.key] ? 'permission-field permission-field--active' : 'permission-field'}
                  onClick={() => toggleField(item.key)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form__field">
            <label htmlFor="reason">申请理由</label>
            <textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="请说明用途和使用范围，至少 20 字"
            />
            {errorMap.reason ? <span className="form__error">{errorMap.reason}</span> : null}
          </div>

          <div className="form__field">
            <label htmlFor="expires">有效期</label>
            <select
              id="expires"
              value={expiresIndex}
              onChange={(event) => setExpiresIndex(Number(event.target.value))}
            >
              {EXPIRES_OPTIONS.map((item, index) => (
                <option key={item} value={index}>
                  {item} 天
                </option>
              ))}
            </select>
          </div>

          {errorMap.form ? <div className="form__error">{errorMap.form}</div> : null}
          {successMessage ? <div className="form__success">{successMessage}</div> : null}

          <div className="form__actions">
            <button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : '提交申请'}
            </button>
            <button type="button" className="button button--secondary" onClick={() => navigate(-1)} disabled={submitting}>
              返回
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default PermissionRequestPage;

