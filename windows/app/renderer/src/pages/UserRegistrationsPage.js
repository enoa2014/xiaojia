import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
const DEFAULT_PAGE_SIZE = 50;
const TABS = [
    { key: 'pending', label: '待审核' },
    { key: 'active', label: '已通过' },
    { key: 'rejected', label: '已驳回' },
];
const statusMeta = (status) => {
    switch (status) {
        case 'active':
            return { text: '已通过', className: 'status-pill status-pill--approved' };
        case 'rejected':
            return { text: '已驳回', className: 'status-pill status-pill--rejected' };
        default:
            return { text: '待审核', className: 'status-pill status-pill--pending' };
    }
};
const applyRoleLabel = (role) => (role === 'parent' ? '家属' : '志愿者');
const formatDateTime = (timestamp) => {
    if (!timestamp)
        return '—';
    try {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(timestamp);
    }
    catch (error) {
        console.warn('invalid timestamp', timestamp, error);
        return '—';
    }
};
const UserRegistrationsPage = () => {
    const [tab, setTab] = useState('pending');
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const loadRegistrations = async (targetTab = tab) => {
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
            }
            else {
                setError(res.error.msg);
                setItems([]);
                setTotal(0);
            }
        }
        catch (err) {
            console.error('load registrations failed', err);
            setError('加载账号申请列表失败，请稍后再试。');
            setItems([]);
            setTotal(0);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadRegistrations('pending');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleSwitchTab = (next) => {
        setTab(next);
        setMessage(null);
        loadRegistrations(next);
    };
    const handleApprove = async (record) => {
        const defaultRole = record.applyRole ?? 'volunteer';
        const roleInput = window.prompt('审批通过，将赋予的角色（volunteer/parent）', defaultRole);
        if (!roleInput)
            return;
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
            }
            else {
                setMessage({ type: 'error', text: res.error.msg });
            }
        }
        catch (err) {
            console.error('approve registration failed', err);
            setMessage({ type: 'error', text: '审批失败，请稍后再试。' });
        }
    };
    const handleReject = async (record) => {
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
            }
            else {
                setMessage({ type: 'error', text: res.error.msg });
            }
        }
        catch (err) {
            console.error('reject registration failed', err);
            setMessage({ type: 'error', text: '驳回失败，请稍后再试。' });
        }
    };
    const headerSummary = useMemo(() => {
        const tabMeta = TABS.find((entry) => entry.key === tab);
        return tabMeta ? `${tabMeta.label}（${total}）` : `${total} 条记录`;
    }, [tab, total]);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u8D26\u53F7\u5BA1\u6838" }), _jsx("p", { children: "\u67E5\u770B\u5E76\u5BA1\u6279\u672C\u5730\u63D0\u4EA4\u7684\u8D26\u53F7\u6CE8\u518C\u4FE1\u606F\uFF0C\u652F\u6301\u5BA1\u6279\u4E3A\u5FD7\u613F\u8005\u6216\u5BB6\u5C5E\u89D2\u8272\u3002" })] }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "registrations-header", children: [_jsx("div", { className: "registrations-tabs", children: TABS.map((entry) => (_jsx("button", { type: "button", className: tab === entry.key ? 'registrations-tab registrations-tab--active' : 'registrations-tab', onClick: () => handleSwitchTab(entry.key), disabled: loading, children: entry.label }, entry.key))) }), _jsx("div", { children: _jsx("button", { type: "button", className: "button button--ghost", onClick: () => loadRegistrations(tab), disabled: loading, children: "\u5237\u65B0" }) })] }), _jsx("div", { className: "registrations-summary", children: headerSummary }), message ? _jsx("div", { className: `auth-message auth-message--${message.type}`, children: message.text }) : null, error ? _jsx("div", { className: "form__error", children: error }) : null, loading ? _jsx("div", { className: "registrations-loading", children: "\u6B63\u5728\u52A0\u8F7D\u8D26\u53F7\u7533\u8BF7\u2026" }) : null, !loading && items.length === 0 ? (_jsx("div", { className: "empty-state", children: "\u6682\u65E0\u76F8\u5173\u8D26\u53F7\u7533\u8BF7\u3002" })) : null, !loading && items.length > 0 ? (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u7533\u8BF7\u4EBA" }), _jsx("th", { children: "\u89D2\u8272" }), _jsx("th", { children: "\u8054\u7CFB\u65B9\u5F0F" }), _jsx("th", { children: "\u5173\u8054\u60A3\u8005" }), _jsx("th", { children: "\u63D0\u4EA4\u65F6\u95F4" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u5907\u6CE8" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: items.map((item) => {
                                        const status = statusMeta(item.status);
                                        return (_jsxs("tr", { children: [_jsx("td", { children: item.name ?? '—' }), _jsx("td", { children: applyRoleLabel(item.applyRole) }), _jsx("td", { children: item.phoneMasked ?? '—' }), _jsx("td", { children: item.relativePatientName ? (_jsxs("span", { children: [item.relativePatientName, item.relativeRelation ? `（${item.relativeRelation}）` : '', item.relativePatientIdCard ? `，${item.relativePatientIdCard}` : ''] })) : ('—') }), _jsx("td", { children: formatDateTime(item.createdAt) }), _jsx("td", { children: _jsx("span", { className: status.className, children: status.text }) }), _jsx("td", { children: item.status === 'rejected' && item.decisionReason ? (_jsx("span", { children: item.decisionReason })) : item.status === 'active' ? (_jsxs("span", { children: ["\u5BA1\u6279\u4EBA\uFF1A", item.decisionBy ?? '—'] })) : ('—') }), _jsx("td", { children: item.status === 'pending' ? (_jsxs("div", { className: "registrations-actions", children: [_jsx("button", { type: "button", onClick: () => handleApprove(item), children: "\u901A\u8FC7" }), _jsx("button", { type: "button", className: "button button--secondary", onClick: () => handleReject(item), children: "\u9A73\u56DE" })] })) : item.status === 'active' ? (_jsx("span", { className: "registrations-note", children: formatDateTime(item.approvedAt) })) : (_jsx("span", { className: "registrations-note", children: formatDateTime(item.rejectedAt) })) })] }, item.id));
                                    }) })] }) })) : null, _jsxs("footer", { className: "registrations-footer", children: [_jsx("span", { children: "\u63D0\u793A\uFF1A\u5BA1\u6279\u7ED3\u679C\u540C\u65F6\u8BB0\u5F55\u5728\u5BA1\u8BA1\u65E5\u5FD7\uFF0C\u6279\u51C6\u540E\u8D26\u53F7\u53EF\u4F7F\u7528\u684C\u9762\u7AEF\u529F\u80FD\u3002" }), _jsx(Link, { to: "/auth/register", children: "\u524D\u5F80\u8D26\u53F7\u6CE8\u518C\u9875" })] })] })] }));
};
export default UserRegistrationsPage;
