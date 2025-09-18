import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
const getInitialActivity = () => ({
    id: '',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    location: null,
    capacity: null,
    status: 'open',
    description: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
const LABELS = {
    title: '活动名称',
    date: '活动日期',
    location: '地点',
    capacity: '容量',
    status: '状态',
    description: '描述',
};
const normalizeText = (value) => {
    if (value == null)
        return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};
const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return value;
};
const ActivityDetailPage = () => {
    const { id = 'new' } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const [activity, setActivity] = useState(() => ({
        ...getInitialActivity(),
        id: isNew ? '' : id,
    }));
    const [originalActivity, setOriginalActivity] = useState(null);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(null);
    const [mode, setMode] = useState(isNew ? 'edit' : 'view');
    useEffect(() => {
        if (isNew) {
            setStatus('ready');
            setMode('edit');
            setOriginalActivity(null);
            return;
        }
        const loadActivity = async () => {
            try {
                setStatus('loading');
                const res = await window.api.activities.get(id);
                if (res.ok) {
                    setActivity(res.data);
                    setOriginalActivity(res.data);
                    setStatus('ready');
                    setMode('view');
                }
                else if (res.error.code === 'E_NOT_FOUND') {
                    setStatus('not-found');
                }
                else {
                    setStatus('error');
                    setError(res.error.msg);
                }
            }
            catch (err) {
                console.error('Failed to fetch activity detail', err);
                setStatus('error');
                setError('加载活动详情时发生异常');
            }
        };
        loadActivity();
    }, [id, isNew]);
    const handleBack = () => navigate(-1);
    const handleStartEdit = () => {
        setSubmitSuccess(null);
        setError(null);
        setFormErrors({});
        setMode('edit');
    };
    const handleCancelEdit = () => {
        if (originalActivity) {
            setActivity(originalActivity);
            setMode('view');
        }
        else {
            setActivity(getInitialActivity());
            setMode('edit');
        }
        setFormErrors({});
        setSubmitSuccess(null);
        setError(null);
    };
    const handleChange = (key) => (event) => {
        if (mode !== 'edit') {
            return;
        }
        const { value } = event.target;
        setActivity((prev) => ({
            ...prev,
            [key]: key === 'capacity' ? (value ? Number(value) || 0 : null) : value,
        }));
    };
    const validate = () => {
        const next = {};
        if (!activity.title.trim()) {
            next.title = '标题不能为空';
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(activity.date)) {
            next.date = '日期格式应为 YYYY-MM-DD';
        }
        if (activity.capacity != null && (!Number.isFinite(activity.capacity) || activity.capacity < 0)) {
            next.capacity = '容量需为非负数字';
        }
        setFormErrors(next);
        return Object.keys(next).length === 0;
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSubmitSuccess(null);
        if (!validate())
            return;
        try {
            setIsSubmitting(true);
            const payload = {
                title: activity.title.trim(),
                date: activity.date,
                location: normalizeText(activity.location),
                capacity: activity.capacity ?? undefined,
                status: activity.status ?? 'open',
                description: normalizeText(activity.description),
            };
            const res = isNew
                ? await window.api.activities.create(payload)
                : await window.api.activities.update({ id: activity.id, patch: payload });
            if (res.ok) {
                setSubmitSuccess('保存成功');
                setActivity(res.data);
                setOriginalActivity(res.data);
                setMode('view');
                if (isNew) {
                    navigate(`/activities/${res.data.id}`);
                }
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error('Failed to submit activity detail', err);
            setError('提交活动信息时发生异常');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const orderedFields = useMemo(() => Object.entries(LABELS), []);
    if (status === 'loading') {
        return (_jsx("div", { className: "page page--center", children: _jsx("p", { children: "\u6B63\u5728\u52A0\u8F7D\u6D3B\u52A8\u4FE1\u606F\u2026" }) }));
    }
    if (status === 'not-found') {
        return (_jsxs("div", { className: "page page--center", children: [_jsx("h1", { children: "\u672A\u627E\u5230\u6D3B\u52A8" }), _jsx("p", { children: "\u7CFB\u7EDF\u4E2D\u4E0D\u5B58\u5728\u8BE5\u6D3B\u52A8\u8BB0\u5F55\u3002" }), _jsx("button", { type: "button", onClick: handleBack, children: "\u8FD4\u56DE" })] }));
    }
    if (status === 'error') {
        return (_jsxs("div", { className: "page page--center", children: [_jsx("h1", { children: "\u52A0\u8F7D\u5931\u8D25" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: handleBack, children: "\u8FD4\u56DE" })] }));
    }
    const renderField = (key, label) => {
        if (mode === 'view') {
            return (_jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "detail-item__label", children: label }), _jsx("span", { className: "detail-item__value", children: formatValue(activity[key]) })] }, key));
        }
        if (key === 'description') {
            return (_jsxs("label", { className: "form-field form-field--textarea", children: [_jsx("span", { children: label }), _jsx("textarea", { value: activity.description ?? '', onChange: (event) => setActivity((prev) => ({ ...prev, description: event.target.value })), placeholder: `请输入${label}` }), formErrors[key] ? (_jsx("small", { className: "form-field__error", children: formErrors[key] })) : null] }, key));
        }
        return (_jsxs("label", { className: "form-field", children: [_jsx("span", { children: label }), _jsx("input", { type: key === 'date' ? 'date' : key === 'capacity' ? 'number' : 'text', value: key === 'capacity' ? activity.capacity ?? '' : (activity[key] ?? ''), onChange: handleChange(key), placeholder: `请输入${label}` }), formErrors[key] ? (_jsx("small", { className: "form-field__error", children: formErrors[key] })) : null] }, key));
    };
    return (_jsxs("div", { className: "page page--detail", children: [_jsxs("header", { className: "page__header detail-header", children: [_jsxs("div", { children: [_jsx("h1", { children: mode === 'edit' ? (isNew ? '新增活动' : '编辑活动') : '活动详情' }), submitSuccess ? _jsx("p", { className: "detail-feedback detail-feedback--success", children: submitSuccess }) : null, error ? _jsx("p", { className: "detail-feedback detail-feedback--error", children: error }) : null] }), _jsxs("div", { className: "detail-actions", children: [_jsx("button", { type: "button", className: "button button--ghost", onClick: handleBack, children: "\u8FD4\u56DE" }), mode === 'view' ? (_jsx("button", { type: "button", className: "button", onClick: handleStartEdit, children: "\u7F16\u8F91" })) : null] })] }), mode === 'view' ? (_jsxs("section", { className: "detail-card", children: [_jsx("div", { className: "detail-grid", children: orderedFields.map(([key, label]) => renderField(key, label)) }), _jsxs("footer", { className: "detail-meta", children: [_jsxs("span", { children: ["\u521B\u5EFA\u65F6\u95F4\uFF1A", formatValue(activity.createdAt)] }), _jsxs("span", { children: ["\u6700\u8FD1\u66F4\u65B0\uFF1A", formatValue(activity.updatedAt)] })] })] })) : (_jsxs("form", { className: "form detail-form", onSubmit: handleSubmit, children: [_jsx("div", { className: "form-grid", children: orderedFields.map(([key, label]) => renderField(key, label)) }), _jsxs("footer", { className: "form-actions", children: [_jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? '保存中…' : '保存' }), _jsx("button", { type: "button", className: "button button--ghost", onClick: handleCancelEdit, disabled: isSubmitting, children: "\u53D6\u6D88" })] })] }))] }));
};
export default ActivityDetailPage;
