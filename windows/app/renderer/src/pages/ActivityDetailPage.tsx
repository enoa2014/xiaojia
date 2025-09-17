import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ActivityRecord } from '@shared/types/activities';

type ViewMode = 'view' | 'edit';

type Status = 'loading' | 'ready' | 'error' | 'not-found';

const getInitialActivity = (): ActivityRecord => ({
  id: '',
  title: '',
  date: new Date().toISOString().slice(0, 10),
  location: null,
  capacity: null,
  status: 'open',
  description: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const LABELS: Record<keyof Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>, string> = {
  title: '活动名称',
  date: '活动日期',
  location: '地点',
  capacity: '容量',
  status: '状态',
  description: '描述',
};

const normalizeText = (value: string | null | undefined) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const formatValue = (value: string | number | null): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return value;
};

const ActivityDetailPage = () => {
  const { id = 'new' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activity, setActivity] = useState<ActivityRecord>(() => ({
    ...getInitialActivity(),
    id: isNew ? '' : id,
  }));
  const [originalActivity, setOriginalActivity] = useState<ActivityRecord | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>(isNew ? 'edit' : 'view');

  useEffect(() => {
    if (isNew) {
      setStatus('ready');
      setMode('edit');
      setOriginalActivity(null);
      return;
    }

    const loadActivity = async () => {
      try {
        setStatus('loading');
        const res = await window.api.activities.get(id);
        if (res.ok) {
          setActivity(res.data);
          setOriginalActivity(res.data);
          setStatus('ready');
          setMode('view');
        } else if (res.error.code === 'E_NOT_FOUND') {
          setStatus('not-found');
        } else {
          setStatus('error');
          setError(res.error.msg);
        }
      } catch (err) {
        console.error('Failed to fetch activity detail', err);
        setStatus('error');
        setError('加载活动详情时发生异常');
      }
    };

    loadActivity();
  }, [id, isNew]);

  const handleBack = () => navigate(-1);

  const handleStartEdit = () => {
    setSubmitSuccess(null);
    setError(null);
    setFormErrors({});
    setMode('edit');
  };

  const handleCancelEdit = () => {
    if (originalActivity) {
      setActivity(originalActivity);
      setMode('view');
    } else {
      setActivity(getInitialActivity());
      setMode('edit');
    }
    setFormErrors({});
    setSubmitSuccess(null);
    setError(null);
  };

  const handleChange = (
    key: keyof ActivityRecord,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (mode !== 'edit') {
      return;
    }
    const { value } = event.target;
    setActivity((prev) => ({
      ...prev,
      [key]: key === 'capacity' ? (value ? Number(value) || 0 : null) : value,
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!activity.title.trim()) {
      next.title = '标题不能为空';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(activity.date)) {
      next.date = '日期格式应为 YYYY-MM-DD';
    }
    if (activity.capacity != null && (!Number.isFinite(activity.capacity) || activity.capacity < 0)) {
      next.capacity = '容量需为非负数字';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitSuccess(null);

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        title: activity.title.trim(),
        date: activity.date,
        location: normalizeText(activity.location),
        capacity: activity.capacity ?? undefined,
        status: activity.status ?? 'open',
        description: normalizeText(activity.description),
      };

      const res = isNew
        ? await window.api.activities.create(payload)
        : await window.api.activities.update({ id: activity.id, patch: payload });

      if (res.ok) {
        setSubmitSuccess('保存成功');
        setActivity(res.data);
        setOriginalActivity(res.data);
        setMode('view');
        if (isNew) {
          navigate(`/activities/${res.data.id}`);
        }
      } else {
        setError(res.error.msg);
      }
    } catch (err) {
      console.error('Failed to submit activity detail', err);
      setError('提交活动信息时发生异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderedFields = useMemo(
    () => Object.entries(LABELS) as Array<[keyof ActivityRecord, string]>,
    [],
  );

  if (status === 'loading') {
    return (
      <div className="page page--center">
        <p>正在加载活动信息…</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="page page--center">
        <h1>未找到活动</h1>
        <p>系统中不存在该活动记录。</p>
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

  const renderField = (key: keyof ActivityRecord, label: string) => {
    if (mode === 'view') {
      return (
        <div key={key as string} className="detail-item">
          <span className="detail-item__label">{label}</span>
          <span className="detail-item__value">{formatValue(activity[key] as string | number | null)}</span>
        </div>
      );
    }

    if (key === 'description') {
      return (
        <label key={key as string} className="form-field form-field--textarea">
          <span>{label}</span>
          <textarea
            value={activity.description ?? ''}
            onChange={(event) => setActivity((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={`请输入${label}`}
          />
          {formErrors[key as string] ? (
            <small className="form-field__error">{formErrors[key as string]}</small>
          ) : null}
        </label>
      );
    }

    return (
      <label key={key as string} className="form-field">
        <span>{label}</span>
        <input
          type={key === 'date' ? 'date' : key === 'capacity' ? 'number' : 'text'}
          value={key === 'capacity' ? activity.capacity ?? '' : (activity[key] ?? '')}
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
          <h1>{mode === 'edit' ? (isNew ? '新增活动' : '编辑活动') : '活动详情'}</h1>
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
            {orderedFields.map(([key, label]) => renderField(key, label))}
          </div>
          <footer className="detail-meta">
            <span>创建时间：{formatValue(activity.createdAt)}</span>
            <span>最近更新：{formatValue(activity.updatedAt)}</span>
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

export default ActivityDetailPage;
