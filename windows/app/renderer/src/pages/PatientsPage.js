import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
const PAGE_SIZE = 20;
const RECENT_THRESHOLD_DAYS = 30;
const QUICK_FILTERS = [
    { key: 'all', label: '全部', description: '显示当前查询条件下的所有患者' },
    { key: 'recent', label: '30天内新增', description: '最近创建的患者档案，便于快速回访' },
    { key: 'noIdCard', label: '缺少证件号', description: '身份证未录入，需补全资料' },
];
const parseDateToTimestamp = (value) => {
    if (!value)
        return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    return date.setHours(0, 0, 0, 0);
};
const formatDateTime = (value) => {
    try {
        return new Date(value).toLocaleString();
    }
    catch (err) {
        console.warn('Invalid date value:', value, err);
        return '-';
    }
};
const PatientsPage = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [searchName, setSearchName] = useState('');
    const [searchTail, setSearchTail] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const pageRef = useRef(1);
    const loadPatients = async ({ reset = false } = {}) => {
        const nextPage = reset ? 1 : pageRef.current;
        const fromTs = parseDateToTimestamp(fromDate);
        const toTs = parseDateToTimestamp(toDate);
        const filterPayload = {
            ...(searchName.trim() ? { name: searchName.trim() } : {}),
            ...(searchTail.trim() ? { id_card_tail: searchTail.trim() } : {}),
            ...(fromTs !== undefined ? { createdFrom: fromTs } : {}),
            ...(toTs !== undefined ? { createdTo: toTs } : {}),
        };
        if (reset) {
            setLoading(true);
            if (nextPage === 1) {
                setPatients([]);
            }
        }
        else {
            setLoadingMore(true);
        }
        try {
            const res = await window.api.patients.list({
                page: nextPage,
                pageSize: PAGE_SIZE,
                filter: Object.keys(filterPayload).length ? filterPayload : undefined,
                sort: { createdAt: -1 },
            });
            if (res.ok) {
                const items = res.data.items;
                setPatients((prev) => (reset ? items : [...prev, ...items]));
                setError(null);
                setTotal(res.data.total);
                const hasNext = items.length === PAGE_SIZE;
                setHasMore(hasNext);
                pageRef.current = hasNext ? nextPage + 1 : nextPage;
            }
            else {
                setError(res.error.msg);
                setHasMore(false);
            }
        }
        catch (err) {
            console.error('Failed to load patients', err);
            setError('加载患者列表时出现异常');
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
        loadPatients({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const derivedLists = useMemo(() => {
        const now = Date.now();
        const threshold = now - RECENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
        const recent = patients.filter((item) => item.createdAt >= threshold);
        const noId = patients.filter((item) => !item.idCard || !item.idCard.trim());
        return {
            all: patients,
            recent,
            noIdCard: noId,
        };
    }, [patients]);
    const displayedPatients = derivedLists[activeFilter];
    const quickFilterCounts = useMemo(() => ({
        all: derivedLists.all.length,
        recent: derivedLists.recent.length,
        noIdCard: derivedLists.noIdCard.length,
    }), [derivedLists]);
    const handleSubmit = (event) => {
        event.preventDefault();
        pageRef.current = 1;
        loadPatients({ reset: true });
    };
    const handleReset = () => {
        setSearchName('');
        setSearchTail('');
        setFromDate('');
        setToDate('');
        pageRef.current = 1;
        loadPatients({ reset: true });
    };
    const handleLoadMore = () => {
        if (!hasMore || loading || loadingMore)
            return;
        loadPatients({ reset: false });
    };
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u60A3\u8005\u6863\u6848" }), _jsx("p", { children: "\u652F\u6301\u6309\u59D3\u540D\u3001\u8EAB\u4EFD\u8BC1\u540E\u56DB\u4F4D\u53CA\u521B\u5EFA\u65E5\u671F\u7B5B\u9009\uFF0C\u5FEB\u901F\u5B9A\u4F4D\u684C\u9762\u7AEF\u60A3\u8005\u8BB0\u5F55\u3002" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "form", onSubmit: handleSubmit, children: [_jsxs("div", { className: "form__row", children: [_jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u59D3\u540D" }), _jsx("input", { type: "text", value: searchName, onChange: (event) => setSearchName(event.target.value), placeholder: "\u8F93\u5165\u524D\u7F00\uFF0C\u4F8B\u5982\u201C\u5F20\u201D" })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u8EAB\u4EFD\u8BC1\u540E\u56DB\u4F4D" }), _jsx("input", { type: "text", value: searchTail, onChange: (event) => setSearchTail(event.target.value), maxLength: 4, placeholder: "1234" })] })] }), _jsxs("div", { className: "form__row", children: [_jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u521B\u5EFA\u65F6\u95F4\uFF08\u8D77\uFF09" }), _jsx("input", { type: "date", value: fromDate, onChange: (event) => setFromDate(event.target.value) })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u521B\u5EFA\u65F6\u95F4\uFF08\u6B62\uFF09" }), _jsx("input", { type: "date", value: toDate, onChange: (event) => setToDate(event.target.value) })] })] }), _jsxs("div", { className: "form__actions", children: [_jsx("button", { type: "submit", disabled: loading, children: loading ? '查询中…' : '查询' }), _jsx("button", { type: "button", className: "button button--secondary", onClick: handleReset, disabled: loading, children: "\u91CD\u7F6E\u6761\u4EF6" }), _jsxs("span", { className: "form__hint", children: ["\u5F53\u524D\u5171 ", total, " \u6761\u8BB0\u5F55\uFF0C\u5DF2\u52A0\u8F7D ", patients.length, " \u6761\u3002"] })] })] }) }), _jsx("section", { className: "card", children: _jsx("div", { className: "quick-filters", children: QUICK_FILTERS.map((item) => (_jsxs("button", { type: "button", className: `quick-filters__item${activeFilter === item.key ? ' quick-filters__item--active' : ''}`, onClick: () => setActiveFilter(item.key), children: [_jsx("strong", { children: item.label }), _jsx("span", { children: item.description }), _jsx("span", { className: "quick-filters__count", children: quickFilterCounts[item.key] })] }, item.key))) }) }), _jsxs("section", { className: "card", children: [_jsxs("header", { className: "card__header", children: [_jsx("h2", { children: "\u5217\u8868" }), _jsx("span", { children: "\u5C55\u793A\u7B26\u5408\u6761\u4EF6\u7684\u60A3\u8005\u6863\u6848\uFF0C\u53EF\u70B9\u51FB\u67E5\u770B\u8BE6\u60C5" })] }), error ? (_jsxs("div", { className: "empty-state empty-state--error", children: [_jsxs("p", { children: ["\u52A0\u8F7D\u5931\u8D25\uFF1A", error] }), _jsx("button", { type: "button", onClick: () => loadPatients({ reset: true }), children: "\u91CD\u65B0\u52A0\u8F7D" })] })) : null, !error && !loading && displayedPatients.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("p", { children: "\u6682\u65E0\u6570\u636E\uFF0C\u8BD5\u8BD5\u4FEE\u6539\u7B5B\u9009\u6761\u4EF6\u3002" }), _jsx("button", { type: "button", onClick: () => loadPatients({ reset: true }), children: "\u91CD\u65B0\u52A0\u8F7D" })] })) : null, _jsx("ul", { className: "list", children: displayedPatients.map((patient) => (_jsxs("li", { className: "list__item", children: [_jsxs("div", { className: "list__item-main", children: [_jsx("h3", { children: patient.name || '未命名患者' }), _jsxs("p", { children: ["\u521B\u5EFA\u65F6\u95F4\uFF1A", formatDateTime(patient.createdAt), " \u00B7 \u6700\u8FD1\u66F4\u65B0\uFF1A", formatDateTime(patient.updatedAt)] }), _jsxs("p", { className: "list__meta", children: [patient.idCardTail ? `证件尾号 ${patient.idCardTail}` : '证件号待补录', " \u00B7", ' ', patient.phone ? `联系电话 ${patient.phone}` : '联系电话未录入'] })] }), _jsx("div", { className: "list__item-actions", children: _jsx(Link, { className: "button", to: `/patients/${patient.id}`, children: "\u67E5\u770B\u8BE6\u60C5" }) })] }, patient.id))) }), hasMore ? (_jsx("div", { className: "list__load-more", children: _jsx("button", { type: "button", onClick: handleLoadMore, disabled: loadingMore, children: loadingMore ? '加载中…' : '加载更多' }) })) : null] })] }));
};
export default PatientsPage;
