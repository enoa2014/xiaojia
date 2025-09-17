import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExportTaskRecord } from '@shared/types/exports';

type TemplateParam = 'month' | 'quarter' | 'dateRange';

type ExportTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  params: TemplateParam[];
};

type TaskState = {
  id: string;
  status: string;
  downloadUrl: string | null;
  updatedAt: number;
};

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'stats-monthly',
    name: '月度统计报表',
    description: '统计服务量、入住率、活动参与情况等月度指标。',
    icon: '📊',
    type: 'statsMonthly',
    params: ['month'],
  },
  {
    id: 'stats-quarterly',
    name: '季度分析报告',
    description: '季度趋势对比，辅助季度复盘。',
    icon: '📈',
    type: 'statsAnnual',
    params: ['quarter'],
  },
  {
    id: 'patients-summary',
    name: '档案汇总表',
    description: '导出患者基础信息、入住记录等关键信息。',
    icon: '👥',
    type: 'custom',
    params: ['dateRange'],
  },
  {
    id: 'services-detail',
    name: '服务记录详单',
    description: '按时间范围导出全部服务记录，适合年终汇总。',
    icon: '📋',
    type: 'custom',
    params: ['dateRange'],
  },
];

const DEFAULT_FORM = () => {
  const now = new Date();
  const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const quarter = now.getFullYear() + '-Q' + String(Math.floor(now.getMonth() / 3) + 1);
  const today = now.toISOString().slice(0, 10);
  return {
    month,
    quarter,
    dateRange: { start: today, end: today },
  };
};

const STATUS_TEXT: Record<string, string> = {
  pending: '等待中',
  running: '处理中',
  done: '已完成',
  failed: '失败',
};

const formatDateTime = (value: number | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  } catch (error) {
    console.warn('invalid export timestamp', value, error);
    return '—';
  }
};

const buildClientToken = (templateId: string) => templateId + ':' + Date.now();

const ExportsPage = () => {
  const [templates] = useState(EXPORT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [form, setForm] = useState(() => DEFAULT_FORM());
  const [history, setHistory] = useState<ExportTaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskState | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cutoffTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM());
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (cutoffTimerRef.current) {
      clearTimeout(cutoffTimerRef.current);
      cutoffTimerRef.current = null;
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await window.api.exports.history({ page: 1, pageSize: 20 });
      if (res.ok) {
        setHistory(res.data.items);
      }
    } catch (err) {
      console.warn('load export history failed', err);
    }
  }, []);

  const buildParams = useCallback(
    (template: ExportTemplate) => {
      const params: Record<string, unknown> = {};
      for (const param of template.params) {
        if (param === 'month') {
          if (!form.month) {
            setError('请选择月份');
            return null;
          }
          params.month = form.month;
        }
        if (param === 'quarter') {
          if (!form.quarter) {
            setError('请选择季度');
            return null;
          }
          params.quarter = form.quarter;
        }
        if (param === 'dateRange') {
          const range = form.dateRange;
          if (!range.start || !range.end) {
            setError('请选择日期范围');
            return null;
          }
          if (range.start > range.end) {
            setError('开始日期不能晚于结束日期');
            return null;
          }
          params.dateRange = { ...range };
        }
      }
      return params;
    },
    [form],
  );

  const checkStatus = useCallback(
    async (taskId: string) => {
      try {
        const res = await window.api.exports.status({ taskId });
        if (res.ok) {
          const data = res.data;
          setTask({
            id: data.id,
            status: data.status,
            downloadUrl: data.downloadUrl ?? null,
            updatedAt: data.updatedAt ?? Date.now(),
          });
          if (data.status === 'done' || data.status === 'failed') {
            stopPolling();
            if (data.status === 'done') {
              await loadHistory();
            }
          }
        }
      } catch (err) {
        console.warn('check export status failed', err);
      }
    },
    [loadHistory, stopPolling],
  );

  const startPolling = useCallback(
    (taskId: string) => {
      stopPolling();
      pollTimerRef.current = setInterval(() => {
        checkStatus(taskId);
      }, 2000);
      cutoffTimerRef.current = setTimeout(() => {
        stopPolling();
      }, 30000);
    },
    [checkStatus, stopPolling],
  );

  const handleCreate = async () => {
    if (!selectedTemplate) {
      setError('请选择导出模板');
      return;
    }
    setError(null);
    const params = buildParams(selectedTemplate);
    if (!params) {
      return;
    }
    setLoading(true);
    try {
      const clientToken = buildClientToken(selectedTemplate.id);
      const res = await window.api.exports.create({
        templateId: selectedTemplate.id,
        type: selectedTemplate.type,
        params,
        clientToken,
      });
      if (res.ok) {
        const data = res.data;
        setTask({
          id: data.id,
          status: data.status,
          downloadUrl: data.downloadUrl ?? null,
          updatedAt: data.updatedAt,
        });
        startPolling(data.id);
      } else {
        setError(res.error.msg ?? '创建导出任务失败');
      }
    } catch (err) {
      console.error('create export task failed', err);
      setError('创建导出任务失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (downloadUrl: string | null) => {
    if (!downloadUrl) return;
    try {
      await window.api.exports.open(downloadUrl);
    } catch (err) {
      console.warn('open export file failed', err);
    }
  };

  const handleTemplateSelect = (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setError(null);
  };

  useEffect(() => {
    loadHistory();
    return () => {
      stopPolling();
    };
  }, [loadHistory, stopPolling]);

  return (
    <div className="page">
      <header className="page__header">
        <h1>数据导出</h1>
        <p>选择需要的模板并设置时间范围，桌面端会生成离线报表文件。</p>
      </header>

      <section className="card">
        <h2>导出模板</h2>
        <div className="export-templates">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={
                selectedTemplate?.id === template.id
                  ? 'export-template export-template--active'
                  : 'export-template'
              }
              onClick={() => handleTemplateSelect(template)}
            >
              <span className="export-template__icon" role="img" aria-hidden="true">
                {template.icon}
              </span>
              <div className="export-template__body">
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>导出参数</h2>
        {error ? <div className="form__error">{error}</div> : null}
        <div className="export-form">
          <label>
            导出月份
            <input
              type="month"
              value={form.month}
              onChange={(event) => setForm((prev) => ({ ...prev, month: event.target.value }))}
              disabled={!selectedTemplate?.params.includes('month')}
            />
          </label>
          <label>
            导出季度
            <input
              type="text"
              value={form.quarter}
              onChange={(event) => setForm((prev) => ({ ...prev, quarter: event.target.value }))}
              placeholder="2024-Q1"
              disabled={!selectedTemplate?.params.includes('quarter')}
            />
          </label>
          <div className="export-form__range">
            <label>
              开始日期
              <input
                type="date"
                value={form.dateRange.start}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dateRange: { ...prev.dateRange, start: event.target.value } }))
                }
                disabled={!selectedTemplate?.params.includes('dateRange')}
              />
            </label>
            <label>
              结束日期
              <input
                type="date"
                value={form.dateRange.end}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dateRange: { ...prev.dateRange, end: event.target.value } }))
                }
                disabled={!selectedTemplate?.params.includes('dateRange')}
              />
            </label>
          </div>
        </div>
        <div className="form__actions">
          <button type="button" onClick={handleCreate} disabled={loading}>
            {loading ? '提交中…' : '创建导出任务'}
          </button>
          <button type="button" className="button button--secondary" onClick={resetForm} disabled={loading}>
            重置表单
          </button>
        </div>
      </section>

      <section className="card">
        <h2>当前任务</h2>
        {task ? (
          <div className="export-task">
            <div>
              <div>任务编号：{task.id}</div>
              <div>状态：{STATUS_TEXT[task.status] ?? task.status}</div>
              <div>更新时间：{formatDateTime(task.updatedAt)}</div>
            </div>
            <div className="export-task__actions">
              <button type="button" className="button button--secondary" onClick={() => stopPolling()}>
                停止轮询
              </button>
              <button type="button" className="button button--secondary" onClick={() => task && checkStatus(task.id)}>
                手动检查
              </button>
              <button type="button" disabled={!task.downloadUrl} onClick={() => handleOpen(task.downloadUrl)}>
                打开文件
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>尚未创建导出任务。</p>
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2>历史记录</h2>
          <button type="button" className="button button--ghost" onClick={loadHistory}>
            刷新
          </button>
        </div>
        {history.length === 0 ? (
          <div className="empty-state">暂无历史导出记录。</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>模板</th>
                <th>类型</th>
                <th>状态</th>
                <th>生成时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{item.templateId ?? item.type}</td>
                  <td>{item.type}</td>
                  <td>{STATUS_TEXT[item.status] ?? item.status}</td>
                  <td>{formatDateTime(item.updatedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="button button--secondary"
                      disabled={!item.downloadUrl}
                      onClick={() => handleOpen(item.downloadUrl ?? null)}
                    >
                      打开文件
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default ExportsPage;
