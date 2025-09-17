import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserRegistrationRecord, UserRegistrationStatus } from '@shared/types/userRegistrations';

const DEFAULT_PAGE_SIZE = 50;

type TabKey = UserRegistrationStatus;

type MessageState = {
  type: 'success' | 'error' | 'info';
  text: string;
} | null;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'pending', label: '待审核' },
  { key: 'active', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
];

const statusMeta = (status: UserRegistrationStatus) => {
  switch (status) {
    case 'active':
      return { text: '已通过', className: 'status-pill status-pill--approved' };
    case 'rejected':
      return { text: '已驳回', className: 'status-pill status-pill--rejected' };
    default:
      return { text: '待审核', className: 'status-pill status-pill--pending' };
  }
};

const applyRoleLabel = (role: 'volunteer' | 'parent') => (role === 'parent' ? '家属' : '志愿者');

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

const UserRegistrationsPage = () => {
  const [tab, setTab] = useState<TabKey>('pending');
  const [items, setItems] = useState<UserRegistrationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState>(null);

  const loadRegistrations = async (targetTab: TabKey = tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.users.listRegistrations({
        status: targetTab,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      if (res.ok) {
        setItems(res.data.items);
        setTotal(res.data.total);
      } else {
        setError(res.error.msg);
        setItems([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('load registrations failed', err);
      setError('加载账号申请列表失败，请稍后再试。');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations('pending');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchTab = (next: TabKey) => {
    setTab(next);
    setMessage(null);
    loadRegistrations(next);
  };

  const handleApprove = async (record: UserRegistrationRecord) => {
    const defaultRole = record.applyRole ?? 'volunteer';
    const roleInput = window.prompt('审批通过，将赋予的角色（volunteer/parent）', defaultRole);
    if (!roleInput) return;
    const role = roleInput === 'parent' ? 'parent' : 'volunteer';
    setMessage(null);
    try {
      const res = await window.api.users.reviewRegistration({
        id: record.id,
        action: 'approve',
        role,
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '已通过该账号申请。' });
        await loadRegistrations(tab);
      } else {
        setMessage({ type: 'error', text: res.error.msg });
      }
    } catch (err) {
      console.error('approve registration failed', err);
      setMessage({ type: 'error', text: '审批失败，请稍后再试。' });
    }
  };

  const handleReject = async (record: UserRegistrationRecord) => {
    const reason = window.prompt('请输入驳回原因（不少于 5 个字）', record.decisionReason ?? '资料不完整');
    if (!reason || reason.trim().length < 5) {
      window.alert('驳回原因至少 5 个字。');
      return;
    }
    setMessage(null);
    try {
      const res = await window.api.users.reviewRegistration({
        id: record.id,
        action: 'reject',
        reason: reason.trim(),
      });
      if (res.ok) {
        setMessage({ type: 'info', text: '已驳回该账号申请。' });
        await loadRegistrations(tab);
      } else {
        setMessage({ type: 'error', text: res.error.msg });
      }
    } catch (err) {
      console.error('reject registration failed', err);
      setMessage({ type: 'error', text: '驳回失败，请稍后再试。' });
    }
  };

  const headerSummary = useMemo(() => {
    const tabMeta = TABS.find((entry) => entry.key === tab);
    return tabMeta ? `${tabMeta.label}（${total}）` : `${total} 条记录`;
  }, [tab, total]);

  return (
    <div className="page">
      <header className="page__header">
        <h1>账号审核</h1>
        <p>查看并审批本地提交的账号注册信息，支持审批为志愿者或家属角色。</p>
      </header>

      <section className="card">
        <div className="registrations-header">
          <div className="registrations-tabs">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={tab === entry.key ? 'registrations-tab registrations-tab--active' : 'registrations-tab'}
                onClick={() => handleSwitchTab(entry.key)}
                disabled={loading}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div>
            <button type="button" className="button button--ghost" onClick={() => loadRegistrations(tab)} disabled={loading}>
              刷新
            </button>
          </div>
        </div>

        <div className="registrations-summary">{headerSummary}</div>

        {message ? <div className={`auth-message auth-message--${message.type}`}>{message.text}</div> : null}
        {error ? <div className="form__error">{error}</div> : null}
        {loading ? <div className="registrations-loading">正在加载账号申请…</div> : null}

        {!loading && items.length === 0 ? (
          <div className="empty-state">暂无相关账号申请。</div>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>申请人</th>
                  <th>角色</th>
                  <th>联系方式</th>
                  <th>关联患者</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = statusMeta(item.status);
                  return (
                    <tr key={item.id}>
                      <td>{item.name ?? '—'}</td>
                      <td>{applyRoleLabel(item.applyRole)}</td>
                      <td>{item.phoneMasked ?? '—'}</td>
                      <td>
                        {item.relativePatientName ? (
                          <span>
                            {item.relativePatientName}
                            {item.relativeRelation ? `（${item.relativeRelation}）` : ''}
                            {item.relativePatientIdCard ? `，${item.relativePatientIdCard}` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        <span className={status.className}>{status.text}</span>
                      </td>
                      <td>
                        {item.status === 'rejected' && item.decisionReason ? (
                          <span>{item.decisionReason}</span>
                        ) : item.status === 'active' ? (
                          <span>审批人：{item.decisionBy ?? '—'}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {item.status === 'pending' ? (
                          <div className="registrations-actions">
                            <button type="button" onClick={() => handleApprove(item)}>
                              通过
                            </button>
                            <button
                              type="button"
                              className="button button--secondary"
                              onClick={() => handleReject(item)}
                            >
                              驳回
                            </button>
                          </div>
                        ) : item.status === 'active' ? (
                          <span className="registrations-note">{formatDateTime(item.approvedAt)}</span>
                        ) : (
                          <span className="registrations-note">{formatDateTime(item.rejectedAt)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <footer className="registrations-footer">
          <span>提示：审批结果同时记录在审计日志，批准后账号可使用桌面端功能。</span>
          <Link to="/auth/register">前往账号注册页</Link>
        </footer>
      </section>
    </div>
  );
};

export default UserRegistrationsPage;
