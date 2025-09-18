import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const clampDate = (value) => {
    if (!value)
        return '';
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed))
        return '';
    return formatDate(new Date(parsed));
};
const buildDailyRequest = ({ from, to }) => ({
    from,
    to,
});
const WEEK_COUNT_OPTIONS = [12, 26, 52];
const YEAR_RANGE_OPTIONS = [3, 5, 10];
const StatsPage = () => {
    const today = useMemo(() => new Date(), []);
    const defaultTo = useMemo(() => formatDate(today), [today]);
    const defaultFrom = useMemo(() => {
        const temp = new Date(today.getTime());
        temp.setDate(temp.getDate() - 6);
        return formatDate(temp);
    }, [today]);
    const currentYear = today.getFullYear();
    const yearOptions = useMemo(() => {
        const list = [];
        for (let year = currentYear; year >= currentYear - 5; year -= 1) {
            list.push(year);
        }
        return list;
    }, [currentYear]);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);
    const [dailyRange, setDailyRange] = useState({ from: defaultFrom, to: defaultTo });
    const [dailyData, setDailyData] = useState(null);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [dailyError, setDailyError] = useState(null);
    const [weeklyYear, setWeeklyYear] = useState(currentYear);
    const [weeklyWeeks, setWeeklyWeeks] = useState(WEEK_COUNT_OPTIONS[0]);
    const [weeklyData, setWeeklyData] = useState(null);
    const [weeklyLoading, setWeeklyLoading] = useState(false);
    const [weeklyError, setWeeklyError] = useState(null);
    const [monthlyYear, setMonthlyYear] = useState(currentYear);
    const [monthlyData, setMonthlyData] = useState(null);
    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [monthlyError, setMonthlyError] = useState(null);
    const [yearlySpan, setYearlySpan] = useState(YEAR_RANGE_OPTIONS[0]);
    const [yearlyData, setYearlyData] = useState(null);
    const [yearlyLoading, setYearlyLoading] = useState(false);
    const [yearlyError, setYearlyError] = useState(null);
    const loadSummary = useCallback(async () => {
        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const res = await window.api.stats.homeSummary();
            if (res.ok) {
                setSummary(res.data);
            }
            else {
                setSummaryError(res.error.msg || '统计概要加载失败');
            }
        }
        catch (error) {
            console.error('load stats summary failed', error);
            setSummaryError('统计概要加载失败');
        }
        finally {
            setSummaryLoading(false);
        }
    }, []);
    const loadDaily = useCallback(async (range) => {
        setDailyLoading(true);
        setDailyError(null);
        try {
            const payload = buildDailyRequest(range);
            const res = await window.api.stats.daily(payload);
            if (res.ok) {
                setDailyData(res.data);
            }
            else {
                setDailyError(res.error.msg || '近7天入住统计加载失败');
            }
        }
        catch (error) {
            console.error('load stats daily failed', error);
            setDailyError('近7天入住统计加载失败');
        }
        finally {
            setDailyLoading(false);
        }
    }, []);
    const loadWeekly = useCallback(async (year, weeks) => {
        setWeeklyLoading(true);
        setWeeklyError(null);
        try {
            const res = await window.api.stats.weekly({ year, weeks });
            if (res.ok) {
                setWeeklyData(res.data);
            }
            else {
                setWeeklyError(res.error.msg || '服务周度统计加载失败');
            }
        }
        catch (error) {
            console.error('load stats weekly failed', error);
            setWeeklyError('服务周度统计加载失败');
        }
        finally {
            setWeeklyLoading(false);
        }
    }, []);
    const loadMonthly = useCallback(async (year) => {
        setMonthlyLoading(true);
        setMonthlyError(null);
        try {
            const res = await window.api.stats.monthly({ year });
            if (res.ok) {
                setMonthlyData(res.data);
            }
            else {
                setMonthlyError(res.error.msg || '患者月度统计加载失败');
            }
        }
        catch (error) {
            console.error('load stats monthly failed', error);
            setMonthlyError('患者月度统计加载失败');
        }
        finally {
            setMonthlyLoading(false);
        }
    }, []);
    const loadYearly = useCallback(async (years) => {
        setYearlyLoading(true);
        setYearlyError(null);
        try {
            const res = await window.api.stats.yearly({ years });
            if (res.ok) {
                setYearlyData(res.data);
            }
            else {
                setYearlyError(res.error.msg || '活动年度统计加载失败');
            }
        }
        catch (error) {
            console.error('load stats yearly failed', error);
            setYearlyError('活动年度统计加载失败');
        }
        finally {
            setYearlyLoading(false);
        }
    }, []);
    useEffect(() => {
        loadSummary();
        loadDaily(dailyRange);
        loadWeekly(weeklyYear, weeklyWeeks);
        loadMonthly(monthlyYear);
        loadYearly(yearlySpan);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleDailySubmit = (event) => {
        event.preventDefault();
        if (!dailyRange.from || !dailyRange.to) {
            setDailyError('请选择完整的起止日期');
            return;
        }
        if (Date.parse(dailyRange.from) > Date.parse(dailyRange.to)) {
            setDailyError('开始日期应不晚于结束日期');
            return;
        }
        loadDaily(dailyRange);
    };
    const renderSeriesTable = (data, emptyText) => {
        if (!data || !data.points.length) {
            return _jsx("div", { className: "stats-empty", children: emptyText });
        }
        return (_jsxs("table", { className: "stats-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u65F6\u95F4" }), _jsx("th", { children: "\u6570\u91CF" })] }) }), _jsx("tbody", { children: data.points.map((point) => (_jsxs("tr", { children: [_jsx("td", { children: point.label }), _jsx("td", { children: point.value.toLocaleString() })] }, point.label))) })] }));
    };
    return (_jsxs("div", { className: "page stats", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u6570\u636E\u770B\u677F" }), _jsx("p", { children: "\u4E86\u89E3\u684C\u9762\u7AEF\u672C\u5730\u6570\u636E\u7684\u6574\u4F53\u89C4\u6A21\u4E0E\u8D8B\u52BF\uFF0C\u652F\u6301\u6309\u7EF4\u5EA6\u5206\u522B\u67E5\u770B\u3002" })] }), _jsxs("section", { className: "card stats-summary", children: [_jsxs("div", { className: "card__header", children: [_jsx("h2", { children: "\u57FA\u7840\u6982\u89C8" }), _jsx("button", { type: "button", className: "button button--secondary", onClick: loadSummary, disabled: summaryLoading, children: summaryLoading ? '刷新中…' : '刷新' })] }), summaryError ? _jsx("div", { className: "stats-error", children: summaryError }) : null, _jsxs("div", { className: "stats-summary__grid", children: [_jsxs("div", { className: "stats-summary__item", children: [_jsx("span", { className: "stats-summary__label", children: "\u60A3\u8005\u6863\u6848" }), _jsx("strong", { className: "stats-summary__value", children: summary?.patients?.toLocaleString() ?? '—' }), _jsx("span", { className: "stats-summary__desc", children: "\u5F53\u524D\u5B58\u91CF" })] }), _jsxs("div", { className: "stats-summary__item", children: [_jsx("span", { className: "stats-summary__label", children: "\u670D\u52A1\u8BB0\u5F55" }), _jsx("strong", { className: "stats-summary__value", children: summary?.services?.toLocaleString() ?? '—' }), _jsx("span", { className: "stats-summary__desc", children: "\u5305\u542B\u5F85\u5BA1\u6838\u3001\u5DF2\u901A\u8FC7" })] }), _jsxs("div", { className: "stats-summary__item", children: [_jsx("span", { className: "stats-summary__label", children: "\u7EBF\u4E0B\u6D3B\u52A8" }), _jsx("strong", { className: "stats-summary__value", children: summary?.activities?.toLocaleString() ?? '—' }), _jsx("span", { className: "stats-summary__desc", children: "\u6D3B\u52A8\u7BA1\u7406\u6A21\u5757" })] }), _jsxs("div", { className: "stats-summary__item", children: [_jsx("span", { className: "stats-summary__label", children: "\u5B89\u7F6E\u8BB0\u5F55" }), _jsx("strong", { className: "stats-summary__value", children: summary?.tenancies?.toLocaleString() ?? '—' }), _jsx("span", { className: "stats-summary__desc", children: "\u5165\u4F4F/\u7EED\u79DF\u7EDF\u8BA1" })] })] })] }), _jsxs("section", { className: "card stats-section", children: [_jsxs("div", { className: "card__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "\u8FD1\u671F\u5F00\u4F4F\u8D8B\u52BF" }), _jsx("span", { className: "card__meta", children: "\u57FA\u4E8E\u5B89\u7F6E\u8BB0\u5F55\u7684\u5165\u4F4F\u6B21\u6570\u7EDF\u8BA1" })] }), _jsxs("form", { className: "stats-filters", onSubmit: handleDailySubmit, children: [_jsxs("label", { children: ["\u5F00\u59CB", _jsx("input", { type: "date", value: dailyRange.from, onChange: (event) => setDailyRange((prev) => ({ ...prev, from: clampDate(event.target.value) })) })] }), _jsxs("label", { children: ["\u7ED3\u675F", _jsx("input", { type: "date", value: dailyRange.to, onChange: (event) => setDailyRange((prev) => ({ ...prev, to: clampDate(event.target.value) })) })] }), _jsx("button", { type: "submit", className: "button button--secondary", disabled: dailyLoading, children: dailyLoading ? '加载中…' : '更新' })] })] }), dailyError ? _jsx("div", { className: "stats-error", children: dailyError }) : null, dailyLoading && !dailyData ? (_jsx("div", { className: "stats-empty", children: "\u52A0\u8F7D\u4E2D\u2026" })) : (renderSeriesTable(dailyData, '暂无入住数据'))] }), _jsxs("section", { className: "card stats-section", children: [_jsxs("div", { className: "card__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "\u670D\u52A1\u5468\u5EA6\u7EDF\u8BA1" }), _jsx("span", { className: "card__meta", children: "\u6309\u5468\u67E5\u770B\u670D\u52A1\u63D0\u4EA4\u6570\u91CF" })] }), _jsxs("div", { className: "stats-filters", children: [_jsxs("label", { children: ["\u5E74\u4EFD", _jsx("select", { value: weeklyYear, onChange: (event) => {
                                                    const nextYear = Number(event.target.value);
                                                    setWeeklyYear(nextYear);
                                                    loadWeekly(nextYear, weeklyWeeks);
                                                }, children: yearOptions.map((item) => (_jsxs("option", { value: item, children: [item, " \u5E74"] }, item))) })] }), _jsxs("label", { children: ["\u5468\u6570", _jsx("select", { value: weeklyWeeks, onChange: (event) => {
                                                    const nextWeeks = Number(event.target.value);
                                                    setWeeklyWeeks(nextWeeks);
                                                    loadWeekly(weeklyYear, nextWeeks);
                                                }, children: WEEK_COUNT_OPTIONS.map((item) => (_jsxs("option", { value: item, children: ["\u6700\u8FD1 ", item, " \u5468"] }, item))) })] })] })] }), weeklyError ? _jsx("div", { className: "stats-error", children: weeklyError }) : null, weeklyLoading && !weeklyData ? (_jsx("div", { className: "stats-empty", children: "\u52A0\u8F7D\u4E2D\u2026" })) : (renderSeriesTable(weeklyData, '暂无服务数据'))] }), _jsxs("section", { className: "card stats-section", children: [_jsxs("div", { className: "card__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "\u60A3\u8005\u6708\u5EA6\u8D8B\u52BF" }), _jsx("span", { className: "card__meta", children: "\u7EDF\u8BA1\u5F53\u5E74\u65B0\u589E\u60A3\u8005\u6863\u6848" })] }), _jsx("div", { className: "stats-filters", children: _jsxs("label", { children: ["\u5E74\u4EFD", _jsx("select", { value: monthlyYear, onChange: (event) => {
                                                const nextYear = Number(event.target.value);
                                                setMonthlyYear(nextYear);
                                                loadMonthly(nextYear);
                                            }, children: yearOptions.map((item) => (_jsxs("option", { value: item, children: [item, " \u5E74"] }, item))) })] }) })] }), monthlyError ? _jsx("div", { className: "stats-error", children: monthlyError }) : null, monthlyLoading && !monthlyData ? (_jsx("div", { className: "stats-empty", children: "\u52A0\u8F7D\u4E2D\u2026" })) : (renderSeriesTable(monthlyData, '暂无患者统计数据'))] }), _jsxs("section", { className: "card stats-section", children: [_jsxs("div", { className: "card__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "\u6D3B\u52A8\u5E74\u5EA6\u7EDF\u8BA1" }), _jsx("span", { className: "card__meta", children: "\u56DE\u987E\u5386\u53F2\u6D3B\u52A8\u8BB0\u5F55" })] }), _jsx("div", { className: "stats-filters", children: _jsxs("label", { children: ["\u5E74\u5EA6\u8303\u56F4", _jsx("select", { value: yearlySpan, onChange: (event) => {
                                                const next = Number(event.target.value);
                                                setYearlySpan(next);
                                                loadYearly(next);
                                            }, children: YEAR_RANGE_OPTIONS.map((item) => (_jsxs("option", { value: item, children: ["\u6700\u8FD1 ", item, " \u5E74"] }, item))) })] }) })] }), yearlyError ? _jsx("div", { className: "stats-error", children: yearlyError }) : null, yearlyLoading && !yearlyData ? (_jsx("div", { className: "stats-empty", children: "\u52A0\u8F7D\u4E2D\u2026" })) : (renderSeriesTable(yearlyData, '暂无活动统计数据'))] })] }));
};
export default StatsPage;
