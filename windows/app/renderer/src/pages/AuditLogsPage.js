import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
const ACTION_OPTIONS = [
    { value: 'all', label: '全部操作', icon: '📋' },
    { value: 'patients.readSensitive', label: '敏感信息访问', icon: '🔓' },
    { value: 'permissions.request.submit', label: '权限申请提交', icon: '📝' },
    { value: 'permissions.approve', label: '权限批准', icon: '✅' },
    { value: 'permissions.reject', label: '权限拒绝', icon: '❌' },
    { value: 'services.review', label: '服务记录审核', icon: '👀' },
    { value: 'exports.create', label: '数据导出创建', icon: '📤' },
    { value: 'exports.status', label: '导出状态查询', icon: '📊' },
];
const PAGE_SIZE = 20;
const DAY = 24 * 60 * 60 * 1000;
const formatDateInput = (date) => date.toISOString().slice(0, 10);
const buildDefaultRange = () => {
    const now = new Date();
    const end = formatDateInput(now);
    const startDate = new Date(now.getTime() - 7 * DAY);
    return { start: formatDateInput(startDate), end };
};
const formatDateTime = (value) => {
    if (!value)
        return '—';
    try {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(value);
    }
    catch (error) {
        console.warn('invalid audit timestamp', value, error);
        return '—';
    }
};
const maskIdentifier = (value) => {
    if (!value)
        return '***';
    if (value.length <= 4)
        return '***' + value;
    return '***' + value.slice(-4);
};
const describeAction = (action) => {
    const option = ACTION_OPTIONS.find((item) => item.value === action);
    return option ? option.label : action;
};
const iconForAction = (action) => {
    const option = ACTION_OPTIONS.find((item) => item.value === action);
    return option ? option.icon : '📌';
};
const describeTarget = (target) => {
    if (!target)
        return '—';
    const patientId = typeof target.patientId === 'string' ? target.patientId : null;
    const serviceId = typeof target.serviceId === 'string' ? target.serviceId : null;
    const requestId = typeof target.requestId === 'string' ? target.requestId : null;
    const taskId = typeof target.taskId === 'string' ? target.taskId : null;
    if (patientId) {
        return '患者 ID ' + maskIdentifier(patientId);
    }
    if (serviceId) {
        return '服务 ID ' + maskIdentifier(serviceId);
    }
    if (requestId) {
        return '申请 ID ' + maskIdentifier(requestId);
    }
    if (taskId) {
        return '任务 ID ' + maskIdentifier(taskId);
    }
    try {
        return JSON.stringify(target);
    }
    catch (error) {
        console.warn('无法序列化审计目标', target, error);
        return '—';
    }
};
const describeDetails = (details) => {
    if (!details)
        return null;
    try {
        return JSON.stringify(details);
    }
    catch (error) {
        console.warn('无法序列化审计详情', details, error);
        return null;
    }
};
const AuditLogsPage = () => {
    const defaultRange = useMemo(() => buildDefaultRange(), []);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [actionFilter, setActionFilter] = useState('all');
    const [startDate, setStartDate] = useState(defaultRange.start);
    const [endDate, setEndDate] = useState(defaultRange.end);
    const [actorFilter, setActorFilter] = useState('');
    const pageRef = useRef(1);
    const buildFilterPayload = useCallback(() => {
        const filter = {};
        if (startDate) {
            filter.from = startDate;
        }
        if (endDate) {
            filter.to = endDate;
        }
        if (actionFilter !== 'all') {
            filter.action = actionFilter;
        }
        const actor = actorFilter.trim();
        if (actor) {
            filter.actorId = actor;
        }
        return Object.keys(filter).length ? filter : undefined;
    }, [actionFilter, actorFilter, startDate, endDate]);
    const loadLogs = useCallback(async (options = {}) => {
        const { reset = false } = options;
        if (loadingMore && !reset) {
            return;
        }
        if (loading && reset) {
            return;
        }
        const currentPage = reset ? 1 : pageRef.current;
        const payload = {
            page: currentPage,
            pageSize: PAGE_SIZE,
        };
        const filterPayload = buildFilterPayload();
        if (filterPayload) {
            payload.filter = filterPayload;
        }
        if (reset) {
            setLoading(true);
            setError(null);
        }
        else {
            setLoadingMore(true);
        }
        try {
            const res = await window.api.audits.list(payload);
            if (res.ok) {
                const items = res.data.items || [];
                setTotal(res.data.total ?? items.length);
                setLogs((prev) => (reset ? items : prev.concat(items)));
                setError(null);
                const totalRecords = res.data.total ?? items.length;
                const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / PAGE_SIZE) : 0;
                const hasNext = currentPage < totalPages;
                setHasMore(hasNext);
                pageRef.current = hasNext ? currentPage + 1 : currentPage;
            }
            else {
                setError(res.error.msg || '加载失败，请稍后重试。');
                if (reset) {
                    setLogs([]);
                    setTotal(0);
                }
                setHasMore(false);
            }
        }
        catch (err) {
            console.error('加载审计日志失败', err);
            setError('加载审计日志时发生异常，请稍候重试。');
            if (reset) {
                setLogs([]);
                setTotal(0);
            }
            setHasMore(false);
        }
        finally {
            if (reset) {
                setLoading(false);
            }
            else {
                setLoadingMore(false);
            }
        }
    }, [buildFilterPayload, loading, loadingMore]);
    useEffect(() => {
        loadLogs({ reset: true });
    }, [loadLogs]);
    const handleSubmit = (event) => {
        event.preventDefault();
        if (startDate && endDate && startDate > endDate) {
            setError('开始日期不能晚于结束日期');
            return;
        }
        pageRef.current = 1;
        loadLogs({ reset: true });
    };
    const handleResetFilters = () => {
        setActionFilter('all');
        setActorFilter('');
        setStartDate(defaultRange.start);
        setEndDate(defaultRange.end);
        setError(null);
        pageRef.current = 1;
        window.setTimeout(() => {
            loadLogs({ reset: true });
        }, 0);
    };
    const handleLoadMore = () => {
        if (loading || loadingMore || !hasMore) {
            return;
        }
        loadLogs({ reset: false });
    };
    const renderActionCell = (log) => (_jsxs("span", { children: [_jsx("span", { role: "img", "aria-hidden": "true", children: iconForAction(log.action) }), ' ', describeAction(log.action)] }));
    const renderTargetCell = (log) => {
        const targetText = describeTarget(log.target);
        const patientId = log.target && typeof log.target.patientId === 'string' ? log.target.patientId : null;
        if (patientId) {
            return _jsx(Link, { to: '/patients/' + patientId, children: targetText });
        }
        return targetText;
    };
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u5BA1\u8BA1\u65E5\u5FD7" }), _jsx("p", { children: "\u8FFD\u8E2A\u654F\u611F\u6570\u636E\u8BBF\u95EE\u4E0E\u5173\u952E\u64CD\u4F5C\uFF0C\u652F\u6301\u6309\u65F6\u95F4\u3001\u64CD\u4F5C\u7C7B\u578B\u548C\u64CD\u4F5C\u4EBA\u7B5B\u9009\u3002" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "filters", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["\u64CD\u4F5C\u7C7B\u578B", _jsx("select", { value: actionFilter, onChange: (event) => setActionFilter(event.target.value), children: ACTION_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.icon + ' ' + option.label }, option.value))) })] }), _jsxs("label", { children: ["\u5F00\u59CB\u65E5\u671F", _jsx("input", { type: "date", value: startDate, onChange: (event) => setStartDate(event.target.value) })] }), _jsxs("label", { children: ["\u7ED3\u675F\u65E5\u671F", _jsx("input", { type: "date", value: endDate, onChange: (event) => setEndDate(event.target.value) })] }), _jsxs("label", { children: ["\u64CD\u4F5C\u4EBA", _jsx("input", { type: "text", value: actorFilter, onChange: (event) => setActorFilter(event.target.value), placeholder: "\u8F93\u5165\u7528\u6237 ID" })] }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "submit", disabled: loading, children: "\u67E5\u8BE2" }), _jsx("button", { type: "button", className: "button button--secondary", onClick: handleResetFilters, disabled: loading, children: "\u91CD\u7F6E" })] })] }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h2", { children: "\u65E5\u5FD7\u5217\u8868" }), _jsxs("span", { className: "card__meta", children: ["\u5171 ", total, " \u6761\u8BB0\u5F55"] }), _jsx("button", { type: "button", className: "button button--ghost", onClick: () => loadLogs({ reset: true }), disabled: loading, children: "\u5237\u65B0" })] }), error ? _jsx("div", { className: "form__error", children: error }) : null, loading && logs.length === 0 ? _jsx("div", { className: "empty-state", children: "\u6B63\u5728\u52A0\u8F7D\u5BA1\u8BA1\u65E5\u5FD7\u2026" }) : null, !loading && logs.length === 0 && !error ? _jsx("div", { className: "empty-state", children: "\u6700\u8FD1\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5BA1\u8BA1\u8BB0\u5F55\u3002" }) : null, logs.length > 0 ? (_jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u65F6\u95F4" }), _jsx("th", { children: "\u64CD\u4F5C" }), _jsx("th", { children: "\u64CD\u4F5C\u4EBA" }), _jsx("th", { children: "\u76EE\u6807" }), _jsx("th", { children: "\u8BF7\u6C42\u53F7" }), _jsx("th", { children: "\u8BE6\u60C5" })] }) }), _jsx("tbody", { children: logs.map((log) => {
                                    const detailsText = describeDetails(log.details);
                                    return (_jsxs("tr", { children: [_jsx("td", { children: formatDateTime(log.createdAt) }), _jsx("td", { children: renderActionCell(log) }), _jsx("td", { children: log.actorId || '—' }), _jsx("td", { children: renderTargetCell(log) }), _jsx("td", { children: log.requestId || '—' }), _jsx("td", { children: detailsText || '—' })] }, log.id));
                                }) })] })) : null, hasMore ? (_jsx("div", { className: "table__footer", children: _jsx("button", { type: "button", onClick: handleLoadMore, disabled: loadingMore, children: loadingMore ? '加载中…' : '加载更多' }) })) : null] })] }));
};
export default AuditLogsPage;
