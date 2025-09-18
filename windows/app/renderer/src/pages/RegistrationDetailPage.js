import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
const STATUS_OPTIONS = [
    { value: 'registered', label: '已报名' },
    { value: 'waitlist', label: '候补' },
    { value: 'checked_in', label: '已签到' },
    { value: 'cancelled', label: '已取消' },
];
const getInitialRegistration = () => ({
    id: '',
    activityId: '',
    userId: null,
    status: 'registered',
    guestContact: null,
    registeredAt: Date.now(),
    cancelledAt: null,
    checkedInAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
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
const parseDateTimeInput = (value) => {
    if (!value)
        return '';
    const iso = new Date(value).toISOString();
    return iso.slice(0, 16);
};
const toTimestamp = (value) => {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? ms : null;
};
const RegistrationDetailPage = () => {
    const { id = 'new' } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const [record, setRecord] = useState(() => ({
        ...getInitialRegistration(),
        id: isNew ? '' : id,
    }));
    const [original, setOriginal] = useState(null);
    const [status, setStatus] = useState('loading');
    const [mode, setMode] = useState(isNew ? 'edit' : 'view');
    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        if (isNew) {
            setStatus('ready');
            return;
        }
        const load = async () => {
            try {
                setStatus('loading');
                const res = await window.api.registrations.get(id);
                if (res.ok) {
                    setRecord(res.data);
                    setOriginal(res.data);
                    setMode('view');
                    setStatus('ready');
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
                console.error('Failed to fetch registration detail', err);
                setStatus('error');
                setError('加载报名详情时发生异常');
            }
        };
        load();
    }, [id, isNew]);
    const handleBack = () => navigate(-1);
    const handleStartEdit = () => {
        setMode('edit');
        setFormErrors({});
        setError(null);
        setSubmitSuccess(null);
    };
    const handleCancelEdit = () => {
        if (original) {
            setRecord(original);
            setMode('view');
        }
        else {
            setRecord(getInitialRegistration());
            setMode('edit');
        }
        setFormErrors({});
        setError(null);
        setSubmitSuccess(null);
    };
    const handleChange = (key) => (event) => {
        if (mode !== 'edit')
            return;
        const { value } = event.target;
        setRecord((prev) => ({
            ...prev,
            [key]: key === 'registeredAt' || key === 'checkedInAt' ? toTimestamp(value) : value,
        }));
    };
    const handleContactChange = (event) => {
        if (mode !== 'edit')
            return;
        const value = event.target.value;
        setRecord((prev) => ({
            ...prev,
            guestContact: value.trim() ? value : null,
        }));
    };
    const validate = () => {
        const next = {};
        if (!record.activityId.trim()) {
            next.activityId = '活动 ID 不能为空';
        }
        if (!record.status.trim()) {
            next.status = '状态不能为空';
        }
        setFormErrors(next);
        return Object.keys(next).length === 0;
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitSuccess(null);
        setError(null);
        if (!validate())
            return;
        try {
            setIsSubmitting(true);
            const payload = {
                activityId: record.activityId.trim(),
                userId: record.userId ?? undefined,
                status: record.status,
                guestContact: record.guestContact ?? undefined,
                registeredAt: record.registeredAt ?? undefined,
                checkedInAt: record.checkedInAt ?? undefined,
            };
            const res = isNew
                ? await window.api.registrations.create(payload)
                : await window.api.registrations.update({ id: record.id, patch: payload });
            if (res.ok) {
                setRecord(res.data);
                setOriginal(res.data);
                setMode('view');
                setSubmitSuccess('保存成功');
                if (isNew) {
                    navigate(`/registrations/${res.data.id}`);
                }
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error('Failed to submit registration', err);
            setError('提交报名记录时发生异常');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const orderedFields = useMemo(() => [
        ['activityId', '活动 ID'],
        ['userId', '用户 ID'],
        ['status', '状态'],
        ['guestContact', '联系方式'],
        ['registeredAt', '报名时间'],
        ['checkedInAt', '签到时间'],
    ], []);
    if (status === 'loading') {
        return (_jsx("div", { className: "page page--center", children: _jsx("p", { children: "\u6B63\u5728\u52A0\u8F7D\u62A5\u540D\u8BE6\u60C5\u2026" }) }));
    }
    if (status === 'not-found') {
        return (_jsxs("div", { className: "page page--center", children: [_jsx("h1", { children: "\u672A\u627E\u5230\u62A5\u540D" }), _jsx("p", { children: "\u7CFB\u7EDF\u4E2D\u4E0D\u5B58\u5728\u8BE5\u62A5\u540D\u8BB0\u5F55\u3002" }), _jsx("button", { type: "button", onClick: handleBack, children: "\u8FD4\u56DE" })] }));
    }
    if (status === 'error') {
        return (_jsxs("div", { className: "page page--center", children: [_jsx("h1", { children: "\u52A0\u8F7D\u5931\u8D25" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: handleBack, children: "\u8FD4\u56DE" })] }));
    }
    const renderField = (key, label) => {
        if (mode === 'view') {
            let displayValue;
            if (key === 'registeredAt')
                displayValue = formatDateTime(record.registeredAt);
            else if (key === 'checkedInAt')
                displayValue = formatDateTime(record.checkedInAt);
            else if (key === 'userId')
                displayValue = record.userId ?? '—';
            else if (key === 'guestContact')
                displayValue = record.guestContact ?? '—';
            else
                displayValue = record[key] ? String(record[key]) : '—';
            return (_jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "detail-item__label", children: label }), _jsx("span", { className: "detail-item__value", children: displayValue })] }, key));
        }
        if (key === 'status') {
            return (_jsxs("label", { className: "form-field", children: [_jsx("span", { children: label }), _jsx("select", { value: record.status, onChange: handleChange('status'), children: STATUS_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), formErrors.status ? _jsx("small", { className: "form-field__error", children: formErrors.status }) : null] }, key));
        }
        if (key === 'registeredAt' || key === 'checkedInAt') {
            return (_jsxs("label", { className: "form-field", children: [_jsx("span", { children: label }), _jsx("input", { type: "datetime-local", value: parseDateTimeInput(key === 'registeredAt' ? record.registeredAt : record.checkedInAt), onChange: handleChange(key), placeholder: `请选择${label}` })] }, key));
        }
        if (key === 'guestContact') {
            return (_jsxs("label", { className: "form-field", children: [_jsx("span", { children: label }), _jsx("input", { type: "text", value: record.guestContact ?? '', onChange: handleContactChange, placeholder: "\u8054\u7CFB\u4EBA\u4FE1\u606F" })] }, key));
        }
        const handlerKey = key;
        return (_jsxs("label", { className: "form-field", children: [_jsx("span", { children: label }), _jsx("input", { type: "text", value: record[key] ?? '', onChange: handleChange(handlerKey), placeholder: `请输入${label}` }), formErrors[key] ? _jsx("small", { className: "form-field__error", children: formErrors[key] }) : null] }, key));
    };
    return (_jsxs("div", { className: "page page--detail", children: [_jsxs("header", { className: "page__header detail-header", children: [_jsxs("div", { children: [_jsx("h1", { children: mode === 'edit' ? (isNew ? '新增报名' : '编辑报名') : '报名详情' }), submitSuccess ? _jsx("p", { className: "detail-feedback detail-feedback--success", children: submitSuccess }) : null, error ? _jsx("p", { className: "detail-feedback detail-feedback--error", children: error }) : null] }), _jsxs("div", { className: "detail-actions", children: [_jsx("button", { type: "button", className: "button button--ghost", onClick: handleBack, children: "\u8FD4\u56DE" }), mode === 'view' ? (_jsx("button", { type: "button", className: "button", onClick: handleStartEdit, children: "\u7F16\u8F91" })) : null] })] }), mode === 'view' ? (_jsxs("section", { className: "detail-card", children: [_jsx("div", { className: "detail-grid", children: orderedFields.map(([key, label]) => renderField(key, label)) }), _jsxs("footer", { className: "detail-meta", children: [_jsxs("span", { children: ["\u521B\u5EFA\u65F6\u95F4\uFF1A", formatDateTime(record.createdAt)] }), _jsxs("span", { children: ["\u6700\u8FD1\u66F4\u65B0\uFF1A", formatDateTime(record.updatedAt)] })] })] })) : (_jsxs("form", { className: "form detail-form", onSubmit: handleSubmit, children: [_jsx("div", { className: "form-grid", children: orderedFields.map(([key, label]) => renderField(key, label)) }), _jsxs("footer", { className: "form-actions", children: [_jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? '保存中…' : '保存' }), _jsx("button", { type: "button", className: "button button--ghost", onClick: handleCancelEdit, disabled: isSubmitting, children: "\u53D6\u6D88" })] })] }))] }));
};
export default RegistrationDetailPage;
