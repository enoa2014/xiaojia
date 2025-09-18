import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
const FIELD_LABEL = {
    id_card: '身份证信息',
    phone: '联系方式',
    diagnosis: '诊断摘要',
};
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
const statusMeta = (status) => {
    switch (status) {
        case 'approved':
            return { text: '已通过', className: 'status-pill status-pill--approved' };
        case 'rejected':
            return { text: '已拒绝', className: 'status-pill status-pill--rejected' };
        default:
            return { text: '待处理', className: 'status-pill status-pill--pending' };
    }
};
const PermissionApprovalsPage = () => {
    const [tab, setTab] = useState('pending');
    const [pending, setPending] = useState([]);
    const [processed, setProcessed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
            }
            else {
                setError(pendingRes.error.msg);
            }
            if (approvedRes.ok && rejectedRes.ok) {
                setProcessed([...approvedRes.data.items, ...rejectedRes.data.items]);
            }
            else {
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
        }
        catch (err) {
            console.error('load permission requests failed', err);
            setError('加载审批列表失败，请稍后重试。');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadRequests();
    }, []);
    const handleDecision = async (record, action) => {
        const verb = action === 'approve' ? '通过' : '拒绝';
        if (!window.confirm(`确认${verb}该申请吗？`))
            return;
        try {
            if (action === 'approve') {
                await window.api.permissionRequests.approve(record.id);
            }
            else {
                const reason = window.prompt('请输入拒绝原因（不少于 5 个字）', '资料用途不符合规范');
                if (!reason || reason.trim().length < 5) {
                    window.alert('拒绝原因至少需要 5 个字。');
                    return;
                }
                await window.api.permissionRequests.reject(record.id, reason.trim());
            }
            await loadRequests();
        }
        catch (err) {
            console.error('approval decision failed', err);
            window.alert(`${verb}失败，请稍后重试。`);
        }
    };
    const currentList = useMemo(() => (tab === 'pending' ? pending : processed), [tab, pending, processed]);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u6743\u9650\u5BA1\u6279" }), _jsx("p", { children: "\u67E5\u770B\u5E76\u5904\u7406\u8D44\u6599\u7533\u8BF7\uFF0C\u5904\u7406\u8BB0\u5F55\u4F1A\u4FDD\u7559\u5728\u201C\u5DF2\u5904\u7406\u201D\u5217\u8868\u4E2D\u3002" })] }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "approvals-header", children: [_jsxs("div", { className: "approvals-tabs", children: [_jsx("button", { type: "button", className: tab === 'pending' ? 'approvals-tab approvals-tab--active' : 'approvals-tab', onClick: () => setTab('pending'), disabled: loading, children: "\u5F85\u5904\u7406" }), _jsx("button", { type: "button", className: tab === 'processed' ? 'approvals-tab approvals-tab--active' : 'approvals-tab', onClick: () => setTab('processed'), disabled: loading, children: "\u5DF2\u5904\u7406" })] }), _jsx("div", { children: _jsx("button", { type: "button", className: "button button--ghost", onClick: loadRequests, disabled: loading, children: "\u5237\u65B0" }) })] }), error ? _jsx("div", { className: "form__error", children: error }) : null, loading ? _jsx("div", { className: "approvals-loading", children: "\u52A0\u8F7D\u4E2D\u2026" }) : null, !loading && currentList.length === 0 ? _jsx("div", { className: "empty-state", children: "\u6682\u65E0\u76F8\u5173\u7533\u8BF7\u3002" }) : null, _jsx("ul", { className: "approvals-list", children: currentList.map((item) => {
                            const status = statusMeta(item.status);
                            return (_jsxs("li", { className: "approvals-item", children: [_jsxs("div", { className: "approvals-item__main", children: [_jsxs("div", { className: "approvals-item__meta", children: [_jsxs("span", { className: "approvals-item__id", children: ["\u7533\u8BF7\u4EBA\uFF1A", item.requesterId] }), _jsx("span", { className: status.className, children: status.text })] }), _jsxs("div", { className: "approvals-item__body", children: [_jsxs("div", { children: [_jsx("strong", { children: "\u60A3\u8005 ID\uFF1A" }), _jsx(Link, { to: `/patients/${item.patientId}`, children: item.patientId })] }), _jsxs("div", { children: [_jsx("strong", { children: "\u7533\u8BF7\u8D44\u6599\uFF1A" }), item.fields.map((field) => (_jsx("span", { className: "approvals-chip", children: FIELD_LABEL[field] ?? field }, field)))] }), _jsxs("div", { children: [_jsx("strong", { children: "\u7533\u8BF7\u539F\u56E0\uFF1A" }), _jsx("span", { children: item.reason })] }), _jsxs("div", { className: "approvals-item__timeline", children: [_jsxs("span", { children: ["\u63D0\u4EA4\uFF1A", formatDateTime(item.createdAt)] }), item.approvedAt ? _jsxs("span", { children: ["\u901A\u8FC7\uFF1A", formatDateTime(item.approvedAt)] }) : null, item.rejectedAt ? _jsxs("span", { children: ["\u62D2\u7EDD\uFF1A", formatDateTime(item.rejectedAt)] }) : null, item.decisionReason ? _jsxs("span", { children: ["\u5907\u6CE8\uFF1A", item.decisionReason] }) : null] })] })] }), tab === 'pending' ? (_jsxs("div", { className: "approvals-item__actions", children: [_jsx("button", { type: "button", onClick: () => handleDecision(item, 'approve'), disabled: loading, children: "\u901A\u8FC7" }), _jsx("button", { type: "button", className: "button button--secondary", onClick: () => handleDecision(item, 'reject'), disabled: loading, children: "\u62D2\u7EDD" })] })) : null] }, item.id));
                        }) })] })] }));
};
export default PermissionApprovalsPage;
