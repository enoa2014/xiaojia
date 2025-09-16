import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PatientRecord } from '@shared/types/patients';

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
  hospital: '医院',
  hospitalDiagnosis: '诊断',
  doctorName: '主治医生',
  symptoms: '症状',
  medicalCourse: '医疗过程',
  followupPlan: '随访计划',
  familyEconomy: '家庭经济',
};

const ID_CARD_REG = /^(?:\d{6})(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
const PHONE_REG = /^1[3-9]\d{9}$/;

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const PatientDetailPage = () => {
  const { id = 'new' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [patient, setPatient] = useState<PatientRecord>(() => ({
    ...getInitialPatient(),
    id: isNew ? '' : id,
  }));
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setStatus('ready');
      return;
    }

    const loadPatient = async () => {
      try {
        setStatus('loading');
        const res = await window.api.patients.get(id);
        if (res.ok) {
          setPatient(res.data);
          setStatus('ready');
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

  const handleChange = (key: keyof PatientRecord) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
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
        navigate(`/patients/${result.data.id}`);
      } else {
        setError(result.error.msg);
      }
    } catch (err) {
      console.error('Failed to submit patient detail', err);
      setError('保存患者信息时发生异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderedFields = useMemo(() => Object.entries(LABELS) as Array<[keyof PatientRecord, string]>, []);

  if (status === 'loading') {
    return (
      <div className="page page--center">
        <p>正在加载患者资料…</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="page page--center">
        <h1>未找到患者</h1>
        <p>我们无法在本地数据库中找到该患者记录。</p>
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

  return (
    <div className="page page--detail">
      <header className="page__header">
        <h1>{isNew ? '新增患者' : '编辑患者'}</h1>
        <button type="button" onClick={handleBack}>返回</button>
      </header>

      {submitSuccess ? <p style={{ color: '#137333' }}>{submitSuccess}</p> : null}
      {error ? <p style={{ color: '#d14343' }}>{error}</p> : null}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {orderedFields.map(([key, label]) => (
            <label key={key} className="form-field">
              <span>{label}</span>
              <input
                type="text"
                value={patient[key] ?? ''}
                onChange={handleChange(key)}
                placeholder={`请输入${label}`}
              />
              {formErrors[key as string] ? (
                <small style={{ color: '#d14343' }}>{formErrors[key as string]}</small>
              ) : null}
            </label>
          ))}
        </div>

        <footer className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isNew ? '创建患者' : '保存修改'}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default PatientDetailPage;
