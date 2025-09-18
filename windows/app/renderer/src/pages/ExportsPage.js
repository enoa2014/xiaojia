import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
const EXPORT_TEMPLATES = [
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
const STATUS_TEXT = {
    pending: '等待中',
    running: '处理中',
    done: '已完成',
    failed: '失败',
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
        console.warn('invalid export timestamp', value, error);
        return '—';
    }
};
const buildClientToken = (templateId) => templateId + ':' + Date.now();
const ExportsPage = () => {
    const [templates] = useState(EXPORT_TEMPLATES);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [form, setForm] = useState(() => DEFAULT_FORM());
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [task, setTask] = useState(null);
    const pollTimerRef = useRef(null);
    const cutoffTimerRef = useRef(null);
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
        }
        catch (err) {
            console.warn('load export history failed', err);
        }
    }, []);
    const buildParams = useCallback((template) => {
        const params = {};
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
    }, [form]);
    const checkStatus = useCallback(async (taskId) => {
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
        }
        catch (err) {
            console.warn('check export status failed', err);
        }
    }, [loadHistory, stopPolling]);
    const startPolling = useCallback((taskId) => {
        stopPolling();
        pollTimerRef.current = setInterval(() => {
            checkStatus(taskId);
        }, 2000);
        cutoffTimerRef.current = setTimeout(() => {
            stopPolling();
        }, 30000);
    }, [checkStatus, stopPolling]);
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
            }
            else {
                setError(res.error.msg ?? '创建导出任务失败');
            }
        }
        catch (err) {
            console.error('create export task failed', err);
            setError('创建导出任务失败，请稍后再试');
        }
        finally {
            setLoading(false);
        }
    };
    const handleOpen = async (downloadUrl) => {
        if (!downloadUrl)
            return;
        try {
            await window.api.exports.open(downloadUrl);
        }
        catch (err) {
            console.warn('open export file failed', err);
        }
    };
    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        setError(null);
    };
    useEffect(() => {
        loadHistory();
        return () => {
            stopPolling();
        };
    }, [loadHistory, stopPolling]);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u6570\u636E\u5BFC\u51FA" }), _jsx("p", { children: "\u9009\u62E9\u9700\u8981\u7684\u6A21\u677F\u5E76\u8BBE\u7F6E\u65F6\u95F4\u8303\u56F4\uFF0C\u684C\u9762\u7AEF\u4F1A\u751F\u6210\u79BB\u7EBF\u62A5\u8868\u6587\u4EF6\u3002" })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "\u5BFC\u51FA\u6A21\u677F" }), _jsx("div", { className: "export-templates", children: templates.map((template) => (_jsxs("button", { type: "button", className: selectedTemplate?.id === template.id
                                ? 'export-template export-template--active'
                                : 'export-template', onClick: () => handleTemplateSelect(template), children: [_jsx("span", { className: "export-template__icon", role: "img", "aria-hidden": "true", children: template.icon }), _jsxs("div", { className: "export-template__body", children: [_jsx("strong", { children: template.name }), _jsx("span", { children: template.description })] })] }, template.id))) })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "\u5BFC\u51FA\u53C2\u6570" }), error ? _jsx("div", { className: "form__error", children: error }) : null, _jsxs("div", { className: "export-form", children: [_jsxs("label", { children: ["\u5BFC\u51FA\u6708\u4EFD", _jsx("input", { type: "month", value: form.month, onChange: (event) => setForm((prev) => ({ ...prev, month: event.target.value })), disabled: !selectedTemplate?.params.includes('month') })] }), _jsxs("label", { children: ["\u5BFC\u51FA\u5B63\u5EA6", _jsx("input", { type: "text", value: form.quarter, onChange: (event) => setForm((prev) => ({ ...prev, quarter: event.target.value })), placeholder: "2024-Q1", disabled: !selectedTemplate?.params.includes('quarter') })] }), _jsxs("div", { className: "export-form__range", children: [_jsxs("label", { children: ["\u5F00\u59CB\u65E5\u671F", _jsx("input", { type: "date", value: form.dateRange.start, onChange: (event) => setForm((prev) => ({ ...prev, dateRange: { ...prev.dateRange, start: event.target.value } })), disabled: !selectedTemplate?.params.includes('dateRange') })] }), _jsxs("label", { children: ["\u7ED3\u675F\u65E5\u671F", _jsx("input", { type: "date", value: form.dateRange.end, onChange: (event) => setForm((prev) => ({ ...prev, dateRange: { ...prev.dateRange, end: event.target.value } })), disabled: !selectedTemplate?.params.includes('dateRange') })] })] })] }), _jsxs("div", { className: "form__actions", children: [_jsx("button", { type: "button", onClick: handleCreate, disabled: loading, children: loading ? '提交中…' : '创建导出任务' }), _jsx("button", { type: "button", className: "button button--secondary", onClick: resetForm, disabled: loading, children: "\u91CD\u7F6E\u8868\u5355" })] })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "\u5F53\u524D\u4EFB\u52A1" }), task ? (_jsxs("div", { className: "export-task", children: [_jsxs("div", { children: [_jsxs("div", { children: ["\u4EFB\u52A1\u7F16\u53F7\uFF1A", task.id] }), _jsxs("div", { children: ["\u72B6\u6001\uFF1A", STATUS_TEXT[task.status] ?? task.status] }), _jsxs("div", { children: ["\u66F4\u65B0\u65F6\u95F4\uFF1A", formatDateTime(task.updatedAt)] })] }), _jsxs("div", { className: "export-task__actions", children: [_jsx("button", { type: "button", className: "button button--secondary", onClick: () => stopPolling(), children: "\u505C\u6B62\u8F6E\u8BE2" }), _jsx("button", { type: "button", className: "button button--secondary", onClick: () => task && checkStatus(task.id), children: "\u624B\u52A8\u68C0\u67E5" }), _jsx("button", { type: "button", disabled: !task.downloadUrl, onClick: () => handleOpen(task.downloadUrl), children: "\u6253\u5F00\u6587\u4EF6" })] })] })) : (_jsx("p", { style: { color: '#6b7280' }, children: "\u5C1A\u672A\u521B\u5EFA\u5BFC\u51FA\u4EFB\u52A1\u3002" }))] }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h2", { children: "\u5386\u53F2\u8BB0\u5F55" }), _jsx("button", { type: "button", className: "button button--ghost", onClick: loadHistory, children: "\u5237\u65B0" })] }), history.length === 0 ? (_jsx("div", { className: "empty-state", children: "\u6682\u65E0\u5386\u53F2\u5BFC\u51FA\u8BB0\u5F55\u3002" })) : (_jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u6A21\u677F" }), _jsx("th", { children: "\u7C7B\u578B" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u751F\u6210\u65F6\u95F4" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: history.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.templateId ?? item.type }), _jsx("td", { children: item.type }), _jsx("td", { children: STATUS_TEXT[item.status] ?? item.status }), _jsx("td", { children: formatDateTime(item.updatedAt) }), _jsx("td", { children: _jsx("button", { type: "button", className: "button button--secondary", disabled: !item.downloadUrl, onClick: () => handleOpen(item.downloadUrl ?? null), children: "\u6253\u5F00\u6587\u4EF6" }) })] }, item.id))) })] }))] })] }));
};
export default ExportsPage;
