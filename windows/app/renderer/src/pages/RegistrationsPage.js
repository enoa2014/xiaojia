import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
const QUICK_FILTERS = [
    { key: 'all', status: null, label: '全部', description: '展示当前条件下的全部报名记录' },
    { key: 'registered', status: 'registered', label: '已报名', description: '已确认参与的报名记录' },
    { key: 'waitlist', status: 'waitlist', label: '候补中', description: '排队等待名额确认的报名' },
    { key: 'checked_in', status: 'checked_in', label: '已签到', description: '活动现场已签到' },
    { key: 'cancelled', status: 'cancelled', label: '已取消', description: '已取消或失效的报名' },
];
const PAGE_SIZE = 20;
const fetchTotal = async (params) => {
    try {
        const res = await window.api.registrations.list({
            page: 1,
            pageSize: 1,
            filter: {
                ...(params.activityId ? { activityId: params.activityId } : {}),
                ...(params.userId ? { userId: params.userId } : {}),
                ...(params.status ? { status: params.status } : {}),
            },
        });
        if (res.ok) {
            return res.data.total;
        }
    }
    catch (err) {
        console.error('[registrations:list] total error', err);
    }
    return 0;
};
const formatDateTime = (value) => {
    if (!value)
        return '—';
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(value);
};
const RegistrationsPage = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [activityId, setActivityId] = useState('');
    const [userId, setUserId] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [totals, setTotals] = useState({
        all: 0,
        registered: 0,
        waitlist: 0,
        checked_in: 0,
        cancelled: 0,
    });
    const pageRef = useRef(1);
    const loadRegistrations = async ({ reset = false, filterKey, activity, user, } = {}) => {
        const targetPage = reset ? 1 : pageRef.current;
        const targetActivity = (activity ?? activityId).trim();
        const targetUser = (user ?? userId).trim();
        const statusKey = filterKey ?? activeFilter;
        const statusMeta = QUICK_FILTERS.find((item) => item.key === statusKey) ?? QUICK_FILTERS[0];
        const statusValue = statusMeta.status;
        if (reset) {
            setLoading(true);
            if (targetPage === 1)
                setRecords([]);
        }
        else {
            setLoadingMore(true);
        }
        try {
            const filterPayload = {
                ...(targetActivity ? { activityId: targetActivity } : {}),
                ...(targetUser ? { userId: targetUser } : {}),
                ...(statusValue ? { status: statusValue } : {}),
            };
            const res = await window.api.registrations.list({
                page: targetPage,
                pageSize: PAGE_SIZE,
                filter: filterPayload,
            });
            if (res.ok) {
                const items = res.data.items;
                setRecords((prev) => (reset ? items : [...prev, ...items]));
                setError(null);
                const hasNext = items.length === PAGE_SIZE;
                setHasMore(hasNext);
                pageRef.current = hasNext ? targetPage + 1 : targetPage;
            }
            else {
                setError(res.error.msg);
                setHasMore(false);
            }
            if (reset) {
                const totalsResult = await Promise.all(QUICK_FILTERS.map(async (filter) => {
                    const total = await fetchTotal({
                        activityId: targetActivity,
                        userId: targetUser,
                        status: filter.status,
                    });
                    return [filter.key, total];
                }));
                setTotals(Object.fromEntries(totalsResult));
            }
        }
        catch (err) {
            console.error('Failed to load registrations', err);
            setError('加载报名记录时出现异常');
            setHasMore(false);
        }
        finally {
            if (reset)
                setLoading(false);
            else
                setLoadingMore(false);
        }
    };
    useEffect(() => {
        loadRegistrations({ reset: true, filterKey: 'all' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleSubmit = (event) => {
        event.preventDefault();
        pageRef.current = 1;
        loadRegistrations({ reset: true });
    };
    const handleReset = () => {
        setActivityId('');
        setUserId('');
        setActiveFilter('all');
        pageRef.current = 1;
        loadRegistrations({ reset: true, filterKey: 'all', activity: '', user: '' });
    };
    const handleLoadMore = () => {
        if (!hasMore || loading || loadingMore)
            return;
        loadRegistrations();
    };
    const handleQuickFilter = (key) => {
        if (key === activeFilter)
            return;
        setActiveFilter(key);
        pageRef.current = 1;
        loadRegistrations({ reset: true, filterKey: key });
    };
    const quickFilters = useMemo(() => QUICK_FILTERS, []);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u62A5\u540D\u8BB0\u5F55" }), _jsx("p", { children: "\u652F\u6301\u6309\u6D3B\u52A8\u4E0E\u62A5\u540D\u72B6\u6001\u7B5B\u9009\uFF0C\u5FEB\u901F\u67E5\u770B\u62A5\u540D/\u5019\u8865/\u7B7E\u5230\u4FE1\u606F\u3002" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "filters", onSubmit: handleSubmit, children: [_jsxs("div", { className: "filters__inputs", children: [_jsxs("label", { className: "filters__field", children: [_jsx("span", { children: "\u6D3B\u52A8 ID" }), _jsx("input", { type: "text", value: activityId, onChange: (event) => setActivityId(event.target.value), placeholder: "\u8F93\u5165\u6D3B\u52A8 ID" })] }), _jsxs("label", { className: "filters__field", children: [_jsx("span", { children: "\u7528\u6237 ID" }), _jsx("input", { type: "text", value: userId, onChange: (event) => setUserId(event.target.value), placeholder: "\u7528\u6237 ID \u6216\u7A7A" })] })] }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "submit", disabled: loading, children: loading ? '查询中…' : '查询' }), _jsx("button", { type: "button", className: "button button--ghost", onClick: handleReset, disabled: loading, children: "\u91CD\u7F6E" }), _jsxs("span", { className: "filters__hint", children: ["\u5171 ", totals.all, " \u6761\u62A5\u540D\u8BB0\u5F55\u3002"] })] })] }) }), _jsx("section", { className: "card", children: _jsx("div", { className: "quick-filters", children: quickFilters.map((item) => (_jsxs("button", { type: "button", className: `quick-filters__item${activeFilter === item.key ? ' quick-filters__item--active' : ''}`, onClick: () => handleQuickFilter(item.key), disabled: loading, children: [_jsx("strong", { children: item.label }), _jsx("span", { children: item.description }), _jsx("span", { className: "quick-filters__count", children: totals[item.key] })] }, item.key))) }) }), _jsxs("section", { className: "card", children: [_jsxs("header", { className: "card__header", children: [_jsx("h2", { children: "\u5217\u8868" }), _jsx("span", { children: "\u5C55\u793A\u7B26\u5408\u6761\u4EF6\u7684\u62A5\u540D\u8BB0\u5F55\uFF0C\u53EF\u8FDB\u5165\u8BE6\u60C5\u67E5\u770B\u5177\u4F53\u4FE1\u606F" })] }), loading && records.length === 0 ? (_jsx("div", { className: "empty-state", children: "\u6B63\u5728\u52A0\u8F7D\u62A5\u540D\u8BB0\u5F55\u2026" })) : error ? (_jsxs("div", { className: "empty-state empty-state--error", children: ["\u52A0\u8F7D\u5931\u8D25\uFF1A", error] })) : records.length === 0 ? (_jsx("div", { className: "empty-state", children: "\u6682\u65E0\u6570\u636E\uFF0C\u8BD5\u8BD5\u4FEE\u6539\u7B5B\u9009\u6761\u4EF6\u3002" })) : (_jsxs(_Fragment, { children: [_jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u6D3B\u52A8" }), _jsx("th", { children: "\u62A5\u540D\u4EBA" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u62A5\u540D\u65F6\u95F4" }), _jsx("th", { children: "\u7B7E\u5230\u65F6\u95F4" }), _jsx("th", {})] }) }), _jsx("tbody", { children: records.map((record) => (_jsxs("tr", { children: [_jsx("td", { children: record.activityId }), _jsx("td", { children: record.userId ?? record.guestContact ?? '—' }), _jsx("td", { children: _jsx("span", { className: `status-pill status-pill--${record.status}`, children: record.status }) }), _jsx("td", { children: formatDateTime(record.registeredAt) }), _jsx("td", { children: formatDateTime(record.checkedInAt) }), _jsx("td", { children: _jsx(Link, { to: `/registrations/${record.id}`, children: "\u67E5\u770B\u8BE6\u60C5" }) })] }, record.id))) })] }), hasMore ? (_jsx("div", { className: "table__footer", children: _jsx("button", { type: "button", onClick: handleLoadMore, disabled: loadingMore, children: loadingMore ? '加载中…' : '加载更多' }) })) : null] }))] })] }));
};
export default RegistrationsPage;
