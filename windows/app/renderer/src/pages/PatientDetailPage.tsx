import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PatientRecord } from '@shared/types/patients';
import type { ServiceRecord, ServiceStatus, ServiceType } from '@shared/types/services';

type ViewMode = 'view' | 'edit';

type Status = 'loading' | 'ready' | 'error' | 'not-found';
type ServiceState = 'idle' | 'loading' | 'ready' | 'error';

const getInitialPatient = (): PatientRecord => ({
  id: '',
  name: '',
  idCard: null,
  idCardTail: null,
  phone: null,
  birthDate: null,
  gender: null,
  nativePlace: null,
  ethnicity: null,
  hospital: null,
  hospitalDiagnosis: null,
  doctorName: null,
  symptoms: null,
  medicalCourse: null,
  followupPlan: null,
  familyEconomy: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const LABELS: Record<keyof Omit<PatientRecord, 'id' | 'idCardTail' | 'createdAt' | 'updatedAt'>, string> = {
  name: '姓名',
  idCard: '身份证号',
  phone: '联系电话',
  birthDate: '出生日期',
  gender: '性别',
  nativePlace: '籍贯',
  ethnicity: '民族',
  hospital: '就诊医院',
  hospitalDiagnosis: '医院诊断',
  doctorName: '医生姓名',
  symptoms: '症状详情',
  medicalCourse: '医疗过程',
  followupPlan: '后续治疗安排',
  familyEconomy: '家庭经济',
};

const ID_CARD_REG = /^(?:\d{6})(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
const PHONE_REG = /^1[3-9]\d{9}$/;

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const formatValue = (value: string | null | number): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'number') {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  }
  return value;
};

const PatientDetailPage = () => {
  const { id = 'new' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [patient, setPatient] = useState<PatientRecord>(() => ({
    ...getInitialPatient(),
    id: isNew ? '' : id,
  }));
  const [originalPatient, setOriginalPatient] = useState<PatientRecord | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>(isNew ? 'edit' : 'view');

  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [serviceState, setServiceState] = useState<ServiceState>('idle');
  const [serviceError, setServiceError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setStatus('ready');
      setOriginalPatient(null);
      setMode('edit');
      return;
    }

    const loadPatient = async () => {
      try {
        setStatus('loading');
        const res = await window.api.patients.get(id);
        if (res.ok) {
          setPatient(res.data);
          setOriginalPatient(res.data);
          setStatus('ready');
          setMode('view');
        } else if (res.error.code === 'E_NOT_FOUND') {
          setStatus('not-found');
        } else {
          setStatus('error');
          setError(res.error.msg);
        }
      } catch (err) {
        console.error('Failed to fetch patient detail', err);
        setStatus('error');
        setError('加载患者详情时发生异常');
      }
    };

    loadPatient();
  }, [id, isNew]);

  const handleBack = () => navigate(-1);

  const handleStartEdit = () => {
    setSubmitSuccess(null);
    setError(null);
    setFormErrors({});
    setMode('edit');
  };

  const handleCancelEdit = () => {
    if (originalPatient) {
      setPatient(originalPatient);
    } else {
      setPatient(getInitialPatient());
    }
    setFormErrors({});
    setSubmitSuccess(null);
    setError(null);
    setMode(originalPatient ? 'view' : 'edit');
  };

  const handleChange = (
    key: keyof PatientRecord,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (mode !== 'edit') {
      return;
    }
    const { value } = event.target;
    setPatient((prev) => ({
      ...prev,
      [key]: key === 'name' ? value : toNullable(value),
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!patient.name.trim()) {
      next.name = '姓名不能为空';
    }
    if (!patient.idCard || !ID_CARD_REG.test(patient.idCard)) {
      next.idCard = '请输入合法的身份证号码';
    }
    if (patient.phone && !PHONE_REG.test(patient.phone)) {
      next.phone = '手机号格式不正确';
    }
    if (patient.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(patient.birthDate)) {
      next.birthDate = '日期格式应为 YYYY-MM-DD';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitSuccess(null);
    setError(null);

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: patient.name.trim(),
        id_card: patient.idCard!,
        phone: patient.phone ?? undefined,
        birthDate: patient.birthDate ?? undefined,
        gender: patient.gender ?? undefined,
        nativePlace: patient.nativePlace ?? undefined,
        ethnicity: patient.ethnicity ?? undefined,
        hospital: patient.hospital ?? undefined,
        hospitalDiagnosis: patient.hospitalDiagnosis ?? undefined,
        doctorName: patient.doctorName ?? undefined,
        symptoms: patient.symptoms ?? undefined,
        medicalCourse: patient.medicalCourse ?? undefined,
        followupPlan: patient.followupPlan ?? undefined,
        familyEconomy: patient.familyEconomy ?? undefined,
      };

      const result = isNew
        ? await window.api.patients.create(payload)
        : await window.api.patients.update({ id: patient.id, patch: payload });

      if (result.ok) {
        setSubmitSuccess('保存成功');
        setOriginalPatient(result.data);
        setPatient(result.data);
        setMode('view');
        if (isNew) {
          navigate(`/patients/${result.data.id}`);
        }
      } else {
        setError(result.error.msg);
      }
    } catch (err) {
      console.error('Failed to submit patient detail', err);
      setError('提交患者信息时发生异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderedFields = useMemo(
    () => Object.entries(LABELS) as Array<[keyof PatientRecord, string]>,
    [],
  );

  if (status === 'loading') {
    return (
      <div className="page page--center">
        <p>正在加载数据…</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="page page--center">
        <h1>未找到记录</h1>
        <p>无法在本地数据库中找到该患者档案。</p>
        <button type="button" onClick={handleBack}>返回</button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page page--center">
        <h1>加载失败</h1>
        <p>{error}</p>
        <button type="button" onClick={handleBack}>返回</button>
      </div>
    );
  }

  const renderField = (key: keyof PatientRecord, label: string) => {
    const value = patient[key];
    if (mode === 'view') {
      return (
        <div key={key as string} className="detail-item">
          <span className="detail-item__label">{label}</span>
          <span className="detail-item__value">{formatValue(value as string | null)}</span>
        </div>
      );
    }

    return (
      <label key={key as string} className="form-field">
        <span>{label}</span>
        <input
          type="text"
          value={patient[key] ?? ''}
          onChange={handleChange(key)}
          placeholder={`请输入${label}`}
        />
        {formErrors[key as string] ? (
          <small className="form-field__error">{formErrors[key as string]}</small>
        ) : null}
      </label>
    );
  };

  return (
    <div className="page page--detail">
      <header className="page__header detail-header">
        <div>
          <h1>{mode === 'edit' ? (isNew ? '新增患者' : '编辑患者') : '患者详情'}</h1>
          {submitSuccess ? <p className="detail-feedback detail-feedback--success">{submitSuccess}</p> : null}
          {error ? <p className="detail-feedback detail-feedback--error">{error}</p> : null}
        </div>
        <div className="detail-actions">
          <button type="button" className="button button--ghost" onClick={handleBack}>
            返回
          </button>
          {!isNew ? (
            <Link className="button button--secondary" to={`/permissions/apply?patientId=${encodeURIComponent(patient.id)}`}>
              申请资料
            </Link>
          ) : null}
          {mode === 'view' ? (
            <button type="button" className="button" onClick={handleStartEdit}>
              编辑
            </button>
          ) : null}
        </div>
      </header>

      {mode === 'view' ? (
        <section className="detail-card">
          <div className="detail-grid">
            {orderedFields.map(([key, label]) => renderField(key, label))}
          </div>
          <footer className="detail-meta">
            <span>创建时间：{formatValue(patient.createdAt)}</span>
            <span>最近更新：{formatValue(patient.updatedAt)}</span>
          </footer>
        </section>
      ) : (
        <form className="form detail-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {orderedFields.map(([key, label]) => renderField(key, label))}
          </div>
          <footer className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
            >
              取消
            </button>
          </footer>
        </form>
      )}
    </div>
  );
};

export default PatientDetailPage;










