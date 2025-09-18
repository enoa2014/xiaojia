import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
const QUICK_FILTERS = [
    { key: 'all', status: null, label: '全部', description: '展示当前筛选条件下的所有活动' },
    { key: 'open', status: 'open', label: '进行中', description: '正在报名或进行的活动' },
    { key: 'closed', status: 'closed', label: '已结束', description: '历史活动留档' },
];
const PAGE_SIZE = 20;
const fetchTotal = async (params) => {
    try {
        const res = await window.api.activities.list({
            page: 1,
            pageSize: 1,
            filter: {
                ...(params.keyword ? { keyword: params.keyword } : {}),
                ...(params.status ? { status: params.status } : {}),
            },
        });
        if (res.ok) {
            return res.data.total;
        }
        return 0;
    }
    catch (err) {
        console.error('[activities:list] failed to fetch total', err);
        return 0;
    }
};
const ActivitiesPage = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [totals, setTotals] = useState({ all: 0, open: 0, closed: 0 });
    const pageRef = useRef(1);
    const loadActivities = async ({ reset = false, keyword: kw, statusKey } = {}) => {
        const targetPage = reset ? 1 : pageRef.current;
        const keywordValue = (kw ?? keyword).trim();
        const filterKey = statusKey ?? activeFilter;
        const statusMeta = QUICK_FILTERS.find((item) => item.key === filterKey) ?? QUICK_FILTERS[0];
        const statusValue = statusMeta.status;
        if (reset) {
            setLoading(true);
            if (targetPage === 1) {
                setActivities([]);
            }
        }
        else {
            setLoadingMore(true);
        }
        try {
            const res = await window.api.activities.list({
                page: targetPage,
                pageSize: PAGE_SIZE,
                filter: {
                    ...(keywordValue ? { keyword: keywordValue } : {}),
                    ...(statusValue ? { status: statusValue } : {}),
                },
                sort: { date: -1 },
            });
            if (res.ok) {
                setActivities((prev) => (reset ? res.data.items : [...prev, ...res.data.items]));
                setError(null);
                const hasNext = res.data.items.length === PAGE_SIZE;
                setHasMore(hasNext);
                pageRef.current = hasNext ? targetPage + 1 : targetPage;
            }
            else {
                setError(res.error.msg);
                setHasMore(false);
            }
            if (reset) {
                const totalResults = await Promise.all(QUICK_FILTERS.map(async (filter) => {
                    const total = await fetchTotal({ keyword: keywordValue, status: filter.status });
                    return [filter.key, total];
                }));
                setTotals(Object.fromEntries(totalResults));
            }
        }
        catch (err) {
            console.error('Failed to load activities', err);
            setError('加载活动列表时出现异常');
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
        loadActivities({ reset: true, keyword: '', statusKey: 'all' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleSubmit = (event) => {
        event.preventDefault();
        pageRef.current = 1;
        loadActivities({ reset: true });
    };
    const handleReset = () => {
        setKeyword('');
        setActiveFilter('all');
        pageRef.current = 1;
        loadActivities({ reset: true, keyword: '', statusKey: 'all' });
    };
    const handleLoadMore = () => {
        if (loading || loadingMore || !hasMore)
            return;
        loadActivities();
    };
    const handleQuickFilter = (key) => {
        if (key === activeFilter)
            return;
        setActiveFilter(key);
        pageRef.current = 1;
        loadActivities({ reset: true, statusKey: key });
    };
    const quickFilters = useMemo(() => QUICK_FILTERS, []);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u6D3B\u52A8\u5217\u8868" }), _jsx("p", { children: "\u652F\u6301\u6309\u5173\u952E\u5B57\u3001\u72B6\u6001\u7B5B\u9009\u6D3B\u52A8\uFF0C\u5FEB\u901F\u67E5\u770B\u5F53\u5730\u6D3B\u52A8\u8FDB\u5EA6" })] }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h2", { children: "\u6D3B\u52A8\u68C0\u7D22" }), _jsx(Link, { className: "button", to: "/activities/new", children: "\u65B0\u589E\u6D3B\u52A8" })] }), _jsxs("form", { className: "filters", onSubmit: handleSubmit, children: [_jsx("div", { className: "filters__inputs", children: _jsxs("label", { className: "filters__field", children: [_jsx("span", { children: "\u5173\u952E\u5B57" }), _jsx("input", { type: "text", value: keyword, onChange: (event) => setKeyword(event.target.value), placeholder: "\u6D3B\u52A8\u6807\u9898\u3001\u7B80\u4ECB\u5173\u952E\u8BCD" })] }) }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "submit", disabled: loading, children: loading ? '查询中…' : '查询' }), _jsx("button", { type: "button", className: "button button--ghost", onClick: handleReset, disabled: loading, children: "\u91CD\u7F6E" }), _jsxs("span", { className: "filters__hint", children: ["\u5171 ", totals.all, " \u6761\u6D3B\u52A8\u8BB0\u5F55\u3002"] })] })] })] }), _jsx("section", { className: "card", children: _jsx("div", { className: "quick-filters", children: quickFilters.map((item) => (_jsxs("button", { type: "button", className: `quick-filters__item${activeFilter === item.key ? ' quick-filters__item--active' : ''}`, onClick: () => handleQuickFilter(item.key), disabled: loading, children: [_jsx("strong", { children: item.label }), _jsx("span", { children: item.description }), _jsx("span", { className: "quick-filters__count", children: totals[item.key] })] }, item.key))) }) }), _jsxs("section", { className: "card", children: [_jsxs("header", { className: "card__header", children: [_jsx("h2", { children: "\u5217\u8868" }), _jsx("span", { children: "\u5C55\u793A\u7B26\u5408\u6761\u4EF6\u7684\u6D3B\u52A8\uFF0C\u53EF\u8FDB\u5165\u8BE6\u60C5\u67E5\u770B\u53C2\u4F1A\u4FE1\u606F" })] }), loading && activities.length === 0 ? (_jsx("div", { className: "empty-state", children: "\u6B63\u5728\u52A0\u8F7D\u6D3B\u52A8\u5217\u8868\u2026" })) : error ? (_jsxs("div", { className: "empty-state empty-state--error", children: ["\u52A0\u8F7D\u5931\u8D25\uFF1A", error] })) : activities.length === 0 ? (_jsx("div", { className: "empty-state", children: "\u6682\u65E0\u6D3B\u52A8\u8BB0\u5F55\uFF0C\u8BD5\u8BD5\u8C03\u6574\u7B5B\u9009\u6216\u65B0\u589E\u6D3B\u52A8\u3002" })) : (_jsxs(_Fragment, { children: [_jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u540D\u79F0" }), _jsx("th", { children: "\u65E5\u671F" }), _jsx("th", { children: "\u5730\u70B9" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u5BB9\u91CF" }), _jsx("th", {})] }) }), _jsx("tbody", { children: activities.map((activity) => (_jsxs("tr", { children: [_jsx("td", { children: activity.title }), _jsx("td", { children: activity.date || '待定' }), _jsx("td", { children: activity.location ?? '待定' }), _jsx("td", { children: _jsx("span", { className: `status-pill status-pill--${activity.status ?? 'unknown'}`, children: activity.status ?? 'unknown' }) }), _jsx("td", { children: activity.capacity ?? '—' }), _jsx("td", { children: _jsx(Link, { to: `/activities/${activity.id}`, children: "\u67E5\u770B\u8BE6\u60C5" }) })] }, activity.id))) })] }), hasMore ? (_jsx("div", { className: "table__footer", children: _jsx("button", { type: "button", onClick: handleLoadMore, disabled: loadingMore, children: loadingMore ? '加载中…' : '加载更多' }) })) : null] }))] })] }));
};
export default ActivitiesPage;
