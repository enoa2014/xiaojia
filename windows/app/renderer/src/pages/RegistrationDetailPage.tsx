import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RegistrationRecord } from '@shared/types/registrations';

type ViewMode = 'view' | 'edit';

type Status = 'loading' | 'ready' | 'error' | 'not-found';

type EditableRegistration = {
  activityId: string;
  userId: string | null;
  status: string;
  guestContact: string | null;
  registeredAt: number | null;
  checkedInAt: number | null;
};

const STATUS_OPTIONS = [
  { value: 'registered', label: '已报名' },
  { value: 'waitlist', label: '候补' },
  { value: 'checked_in', label: '已签到' },
  { value: 'cancelled', label: '已取消' },
];

const getInitialRegistration = (): RegistrationRecord => ({
  id: '',
  activityId: '',
  userId: null,
  status: 'registered',
  guestContact: null,
  registeredAt: Date.now(),
  cancelledAt: null,
  checkedInAt: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const formatDateTime = (value: number | null): string => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
};

const parseDateTimeInput = (value: number | null): string => {
  if (!value) return '';
  const iso = new Date(value).toISOString();
  return iso.slice(0, 16);
};

const toTimestamp = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
};

const RegistrationDetailPage = () => {
  const { id = 'new' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [record, setRecord] = useState<RegistrationRecord>(() => ({
    ...getInitialRegistration(),
    id: isNew ? '' : id,
  }));
  const [original, setOriginal] = useState<RegistrationRecord | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [mode, setMode] = useState<ViewMode>(isNew ? 'edit' : 'view');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) {
      setStatus('ready');
      return;
    }

    const load = async () => {
      try {
        setStatus('loading');
        const res = await window.api.registrations.get(id);
        if (res.ok) {
          setRecord(res.data);
          setOriginal(res.data);
          setMode('view');
          setStatus('ready');
        } else if (res.error.code === 'E_NOT_FOUND') {
          setStatus('not-found');
        } else {
          setStatus('error');
          setError(res.error.msg);
        }
      } catch (err) {
        console.error('Failed to fetch registration detail', err);
        setStatus('error');
        setError('加载报名详情时发生异常');
      }
    };

    load();
  }, [id, isNew]);

  const handleBack = () => navigate(-1);

  const handleStartEdit = () => {
    setMode('edit');
    setFormErrors({});
    setError(null);
    setSubmitSuccess(null);
  };

  const handleCancelEdit = () => {
    if (original) {
      setRecord(original);
      setMode('view');
    } else {
      setRecord(getInitialRegistration());
      setMode('edit');
    }
    setFormErrors({});
    setError(null);
    setSubmitSuccess(null);
  };

  const handleChange = (key: keyof EditableRegistration) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (mode !== 'edit') return;
    const { value } = event.target;
    setRecord((prev) => ({
      ...prev,
      [key]: key === 'registeredAt' || key === 'checkedInAt' ? toTimestamp(value) : value,
    }));
  };

  const handleContactChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mode !== 'edit') return;
    const value = event.target.value;
    setRecord((prev) => ({
      ...prev,
      guestContact: value.trim() ? value : null,
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!record.activityId.trim()) {
      next.activityId = '活动 ID 不能为空';
    }
    if (!record.status.trim()) {
      next.status = '状态不能为空';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitSuccess(null);
    setError(null);

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        activityId: record.activityId.trim(),
        userId: record.userId ?? undefined,
        status: record.status,
        guestContact: record.guestContact ?? undefined,
        registeredAt: record.registeredAt ?? undefined,
        checkedInAt: record.checkedInAt ?? undefined,
      };

      const res = isNew
        ? await window.api.registrations.create(payload)
        : await window.api.registrations.update({ id: record.id, patch: payload });

      if (res.ok) {
        setRecord(res.data);
        setOriginal(res.data);
        setMode('view');
        setSubmitSuccess('保存成功');
        if (isNew) {
          navigate(`/registrations/${res.data.id}`);
        }
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error('Failed to submit registration', err);
      setError('提交报名记录时发生异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderedFields = useMemo(
    () => [
      ['activityId', '活动 ID'],
      ['userId', '用户 ID'],
      ['status', '状态'],
      ['guestContact', '联系方式'],
      ['registeredAt', '报名时间'],
      ['checkedInAt', '签到时间'],
    ] as Array<[keyof RegistrationRecord, string]>,
    [],
  );

  if (status === 'loading') {
    return (
      <div className="page page--center">
        <p>正在加载报名详情…</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="page page--center">
        <h1>未找到报名</h1>
        <p>系统中不存在该报名记录。</p>
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

  const renderField = (key: keyof RegistrationRecord, label: string) => {
    if (mode === 'view') {
      let displayValue: string;
      if (key === 'registeredAt') displayValue = formatDateTime(record.registeredAt);
      else if (key === 'checkedInAt') displayValue = formatDateTime(record.checkedInAt);
      else if (key === 'userId') displayValue = record.userId ?? '—';
      else if (key === 'guestContact') displayValue = record.guestContact ?? '—';
      else displayValue = record[key] ? String(record[key]) : '—';
      return (
        <div key={key} className="detail-item">
          <span className="detail-item__label">{label}</span>
          <span className="detail-item__value">{displayValue}</span>
        </div>
      );
    }

    if (key === 'status') {
      return (
        <label key={key} className="form-field">
          <span>{label}</span>
          <select value={record.status} onChange={handleChange('status')}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formErrors.status ? <small className="form-field__error">{formErrors.status}</small> : null}
        </label>
      );
    }

    if (key === 'registeredAt' || key === 'checkedInAt') {
      return (
        <label key={key} className="form-field">
          <span>{label}</span>
          <input
            type="datetime-local"
            value={parseDateTimeInput(key === 'registeredAt' ? record.registeredAt : record.checkedInAt)}
            onChange={handleChange(key as keyof EditableRegistration)}
            placeholder={`请选择${label}`}
          />
        </label>
      );
    }

    if (key === 'guestContact') {
      return (
        <label key={key} className="form-field">
          <span>{label}</span>
          <input
            type="text"
            value={record.guestContact ?? ''}
            onChange={handleContactChange}
            placeholder="联系人信息"
          />
        </label>
      );
    }

    const handlerKey = key as keyof EditableRegistration;
    return (
      <label key={key} className="form-field">
        <span>{label}</span>
        <input
          type="text"
          value={record[key] ?? ''}
          onChange={handleChange(handlerKey)}
          placeholder={`请输入${label}`}
        />
        {formErrors[key as string] ? <small className="form-field__error">{formErrors[key as string]}</small> : null}
      </label>
    );
  };

  return (
    <div className="page page--detail">
      <header className="page__header detail-header">
        <div>
          <h1>{mode === 'edit' ? (isNew ? '新增报名' : '编辑报名') : '报名详情'}</h1>
          {submitSuccess ? <p className="detail-feedback detail-feedback--success">{submitSuccess}</p> : null}
          {error ? <p className="detail-feedback detail-feedback--error">{error}</p> : null}
        </div>
        <div className="detail-actions">
          <button type="button" className="button button--ghost" onClick={handleBack}>
            返回
          </button>
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
            {orderedFields.map(([key, label]) => renderField(key as keyof RegistrationRecord, label))}
          </div>
          <footer className="detail-meta">
            <span>创建时间：{formatDateTime(record.createdAt)}</span>
            <span>最近更新：{formatDateTime(record.updatedAt)}</span>
          </footer>
        </section>
      ) : (
        <form className="form detail-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {orderedFields.map(([key, label]) => renderField(key as keyof RegistrationRecord, label))}
          </div>
          <footer className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中…' : '保存'}
            </button>
            <button type="button" className="button button--ghost" onClick={handleCancelEdit} disabled={isSubmitting}>
              取消
            </button>
          </footer>
        </form>
      )}
    </div>
  );
};

export default RegistrationDetailPage;

