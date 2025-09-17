import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PermissionRequestRecord } from '@shared/types/permissions';

type TabKey = 'pending' | 'processed';
type Decision = 'approve' | 'reject';

const FIELD_LABEL: Record<string, string> = {
  id_card: '证件信息',
  phone: '联系方式',
  diagnosis: '病历摘要',
};

const formatDateTime = (timestamp: number | null) => {
  if (!timestamp) return '—';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  } catch (error) {
    console.warn('invalid timestamp', timestamp, error);
    return '—';
  }
};

const statusMeta = (status: PermissionRequestRecord['status']) => {
  switch (status) {
    case 'approved':
      return { text: '已批准', className: 'status-pill status-pill--approved' };
    case 'rejected':
      return { text: '已拒绝', className: 'status-pill status-pill--rejected' };
    default:
      return { text: '待处理', className: 'status-pill status-pill--pending' };
  }
};

const PermissionApprovalsPage = () => {
  const [tab, setTab] = useState<TabKey>('pending');
  const [pending, setPending] = useState<PermissionRequestRecord[]>([]);
  const [processed, setProcessed] = useState<PermissionRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        window.api.permissionRequests.list({ filter: { status: 'pending' } }),
        window.api.permissionRequests.list({ filter: { status: 'approved' } }),
        window.api.permissionRequests.list({ filter: { status: 'rejected' } }),
      ]);

      if (pendingRes.ok) {
        setPending(pendingRes.data.items);
      } else {
        setError(pendingRes.error.msg);
      }

      if (approvedRes.ok && rejectedRes.ok) {
        setProcessed([...approvedRes.data.items, ...rejectedRes.data.items]);
      } else {
        if (approvedRes.ok) {
          setProcessed(approvedRes.data.items);
        }
        if (!approvedRes.ok) {
          setError((prev) => prev ?? approvedRes.error.msg);
        }
        if (!rejectedRes.ok) {
          setError((prev) => prev ?? rejectedRes.error.msg);
        }
      }
    } catch (err) {
      console.error('load permission requests failed', err);
      setError('加载审批列表失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecision = async (record: PermissionRequestRecord, action: Decision) => {
    const verb = action === 'approve' ? '批准' : '拒绝';
    if (!window.confirm(`确认${verb}该申请？`)) return;

    try {
      if (action === 'approve') {
        await window.api.permissionRequests.approve(record.id);
      } else {
        const reason = window.prompt('请输入拒绝原因（至少 5 个字）', '资料用途不明');
        if (!reason || reason.trim().length < 5) {
          alert('拒绝原因不少于 5 个字。');
          return;
        }
        await window.api.permissionRequests.reject(record.id, reason.trim());
      }
      await loadRequests();
    } catch (err) {
      console.error('approval decision failed', err);
      alert(`${verb}失败，请稍后再试。`);
    }
  };

  const currentList = useMemo(
    () => (tab === 'pending' ? pending : processed),
    [tab, pending, processed],
  );

  return (
    <div className="page">
      <header className="page__header">
        <h1>权限审批</h1>
        <p>查看并处理资料查看申请，已处理记录会保留在“已处理”标签中。</p>
      </header>

      <section className="card">
        <div className="approvals-header">
          <div className="approvals-tabs">
            <button
              type="button"
              className={tab === 'pending' ? 'approvals-tab approvals-tab--active' : 'approvals-tab'}
              onClick={() => setTab('pending')}
              disabled={loading}
            >
              待处理
            </button>
            <button
              type="button"
              className={tab === 'processed' ? 'approvals-tab approvals-tab--active' : 'approvals-tab'}
              onClick={() => setTab('processed')}
              disabled={loading}
            >
              已处理
            </button>
          </div>
          <div>
            <button type="button" className="button button--ghost" onClick={loadRequests} disabled={loading}>
              刷新
            </button>
          </div>
        </div>

        {error ? <div className="form__error">{error}</div> : null}
        {loading ? <div className="approvals-loading">加载中…</div> : null}
        {!loading && currentList.length === 0 ? <div className="empty-state">暂无相关申请。</div> : null}

        <ul className="approvals-list">
          {currentList.map((item) => {
            const status = statusMeta(item.status);
            return (
              <li key={item.id} className="approvals-item">
                <div className="approvals-item__main">
                  <div className="approvals-item__meta">
                    <span className="approvals-item__id">申请人：{item.requesterId}</span>
                    <span className={status.className}>{status.text}</span>
                  </div>
                  <div className="approvals-item__body">
                    <div>
                      <strong>患者 ID：</strong>
                      <Link to={`/patients/${item.patientId}`}>{item.patientId}</Link>
                    </div>
                    <div>
                      <strong>申请资料：</strong>
                      {item.fields.map((field) => (
                        <span key={field} className="approvals-chip">
                          {FIELD_LABEL[field] ?? field}
                        </span>
                      ))}
                    </div>
                    <div>
                      <strong>申请理由：</strong>
                      <span>{item.reason}</span>
                    </div>
                    <div className="approvals-item__timeline">
                      <span>提交：{formatDateTime(item.createdAt)}</span>
                      {item.approvedAt ? <span>批准：{formatDateTime(item.approvedAt)}</span> : null}
                      {item.rejectedAt ? <span>拒绝：{formatDateTime(item.rejectedAt)}</span> : null}
                      {item.decisionReason ? <span>备注：{item.decisionReason}</span> : null}
                    </div>
                  </div>
                </div>
                {tab === 'pending' ? (
                  <div className="approvals-item__actions">
                    <button type="button" onClick={() => handleDecision(item, 'approve')} disabled={loading}>
                      批准
                    </button>
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => handleDecision(item, 'reject')}
                      disabled={loading}
                    >
                      拒绝
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default PermissionApprovalsPage;