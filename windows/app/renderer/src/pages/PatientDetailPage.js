import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
const getInitialPatient = () => ({
    id: '',
    name: '',
    idCard: null,
    idCardTail: null,
    phone: null,
    birthDate: null,
    gender: null,
    nativePlace: null,
    ethnicity: null,
    hospital: null,
    hospitalDiagnosis: null,
    doctorName: null,
    symptoms: null,
    medicalCourse: null,
    followupPlan: null,
    familyEconomy: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
const LABELS = {
    name: '姓名',
    idCard: '身份证号',
    phone: '联系电话',
    birthDate: '出生日期',
    gender: '性别',
    nativePlace: '籍贯',
    ethnicity: '民族',
    hospital: '就诊医院',
    hospitalDiagnosis: '医院诊断',
    doctorName: '医生姓名',
    symptoms: '症状详情',
    medicalCourse: '医疗过程',
    followupPlan: '后续治疗安排',
    familyEconomy: '家庭经济',
};
const ID_CARD_REG = /^(?:\d{6})(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
const PHONE_REG = /^1[3-9]\d{9}$/;
const toNullable = (value) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};
const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    if (typeof value === 'number') {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(value);
    }
    return value;
};
const PatientDetailPage = () => {
    const { id = 'new' } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const [patient, setPatient] = useState(() => ({
        ...getInitialPatient(),
        id: isNew ? '' : id,
    }));
    const [originalPatient, setOriginalPatient] = useState(null);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(null);
    const [mode, setMode] = useState(isNew ? 'edit' : 'view');
    const [services, setServices] = useState([]);
    const [serviceState, setServiceState] = useState('idle');
    const [serviceError, setServiceError] = useState(null);
    useEffect(() => {
        if (isNew) {
            setStatus('ready');
            setOriginalPatient(null);
            setMode('edit');
            return;
        }
        const loadPatient = async () => {
            try {
                setStatus('loading');
                const res = await window.api.patients.get(id);
                if (res.ok) {
                    setPatient(res.data);
                    setOriginalPatient(res.data);
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
                console.error('Failed to fetch patient detail', err);
                setStatus('error');
                setError('加载患者详情时发生异常');
            }
        };
        loadPatient();
    }, [id, isNew]);
    const handleBack = () => navigate(-1);
    const handleStartEdit = () => {
        setSubmitSuccess(null);
        setError(null);
        setFormErrors({});
        setMode('edit');
    };
    const handleCancelEdit = () => {
        if (originalPatient) {
            setPatient(originalPatient);
        }
        else {
            setPatient(getInitialPatient());
        }
        setFormErrors({});
        setSubmitSuccess(null);
        setError(null);
        setMode(originalPatient ? 'view' : 'edit');
    };
    const handleChange = (key) => (event) => {
        if (mode !== 'edit') {
            return;
        }
        const { value } = event.target;
        setPatient((prev) => ({
            ...prev,
            [key]: key === 'name' ? value : toNullable(value),
        }));
    };
    const validate = () => {
        const next = {};
        if (!patient.name.trim()) {
            next.name = '姓名不能为空';
        }
        if (!patient.idCard || !ID_CARD_REG.test(patient.idCard)) {
            next.idCard = '请输入合法的身份证号码';
        }
        if (patient.phone && !PHONE_REG.test(patient.phone)) {
            next.phone = '手机号格式不正确';
        }
        if (patient.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(patient.birthDate)) {
            next.birthDate = '日期格式应为 YYYY-MM-DD';
        }
        setFormErrors(next);
        return Object.keys(next).length === 0;
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitSuccess(null);
        setError(null);
        if (!validate()) {
            return;
        }
        try {
            setIsSubmitting(true);
            const payload = {
                name: patient.name.trim(),
                id_card: patient.idCard,
                phone: patient.phone ?? undefined,
                birthDate: patient.birthDate ?? undefined,
                gender: patient.gender ?? undefined,
                nativePlace: patient.nativePlace ?? undefined,
                ethnicity: patient.ethnicity ?? undefined,
                hospital: patient.hospital ?? undefined,
                hospitalDiagnosis: patient.hospitalDiagnosis ?? undefined,
                doctorName: patient.doctorName ?? undefined,
                symptoms: patient.symptoms ?? undefined,
                medicalCourse: patient.medicalCourse ?? undefined,
                followupPlan: patient.followupPlan ?? undefined,
                familyEconomy: patient.familyEconomy ?? undefined,
            };
            const result = isNew
                ? await window.api.patients.create(payload)
                : await window.api.patients.update({ id: patient.id, patch: payload });
            if (result.ok) {
                setSubmitSuccess('保存成功');
                setOriginalPatient(result.data);
                setPatient(result.data);
                setMode('view');
                if (isNew) {
                    navigate(`/patients/${result.data.id}`);
                }
            }
            else {
                setError(result.error.msg);
            }
        }
        catch (err) {
            console.error('Failed to submit patient detail', err);
            setError('提交患者信息时发生异常');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const orderedFields = useMemo(() => Object.entries(LABELS), []);
    if (status === 'loading') {
        return (_jsx("div", { className: "page page--center", children: _jsx("p", { children: "\u6B63\u5728\u52A0\u8F7D\u6570\u636E\u2026" }) }));
    }
    if (status === 'not-found') {
        return (_jsxs("div", { className: "page page--center", children: [_jsx("h1", { children: "\u672A\u627E\u5230\u8BB0\u5F55" }), _jsx("p", { children: "\u65E0\u6CD5\u5728\u672C\u5730\u6570\u636E\u5E93\u4E2D\u627E\u5230\u8BE5\u60A3\u8005\u6863\u6848\u3002" }), _jsx("button", { type: "button", onClick: handleBack, children: "\u8FD4\u56DE" })] }));
    }
    if (status === 'error') {
        return (_jsxs("div", { className: "page page--center", children: [_jsx("h1", { children: "\u52A0\u8F7D\u5931\u8D25" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: handleBack, children: "\u8FD4\u56DE" })] }));
    }
    const renderField = (key, label) => {
        const value = patient[key];
        if (mode === 'view') {
            return (_jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "detail-item__label", children: label }), _jsx("span", { className: "detail-item__value", children: formatValue(value) })] }, key));
        }
        return (_jsxs("label", { className: "form-field", children: [_jsx("span", { children: label }), _jsx("input", { type: "text", value: patient[key] ?? '', onChange: handleChange(key), placeholder: `请输入${label}` }), formErrors[key] ? (_jsx("small", { className: "form-field__error", children: formErrors[key] })) : null] }, key));
    };
    return (_jsxs("div", { className: "page page--detail", children: [_jsxs("header", { className: "page__header detail-header", children: [_jsxs("div", { children: [_jsx("h1", { children: mode === 'edit' ? (isNew ? '新增患者' : '编辑患者') : '患者详情' }), submitSuccess ? _jsx("p", { className: "detail-feedback detail-feedback--success", children: submitSuccess }) : null, error ? _jsx("p", { className: "detail-feedback detail-feedback--error", children: error }) : null] }), _jsxs("div", { className: "detail-actions", children: [_jsx("button", { type: "button", className: "button button--ghost", onClick: handleBack, children: "\u8FD4\u56DE" }), !isNew ? (_jsx(Link, { className: "button button--secondary", to: `/permissions/apply?patientId=${encodeURIComponent(patient.id)}`, children: "\u7533\u8BF7\u8D44\u6599" })) : null, mode === 'view' ? (_jsx("button", { type: "button", className: "button", onClick: handleStartEdit, children: "\u7F16\u8F91" })) : null] })] }), mode === 'view' ? (_jsxs("section", { className: "detail-card", children: [_jsx("div", { className: "detail-grid", children: orderedFields.map(([key, label]) => renderField(key, label)) }), _jsxs("footer", { className: "detail-meta", children: [_jsxs("span", { children: ["\u521B\u5EFA\u65F6\u95F4\uFF1A", formatValue(patient.createdAt)] }), _jsxs("span", { children: ["\u6700\u8FD1\u66F4\u65B0\uFF1A", formatValue(patient.updatedAt)] })] })] })) : (_jsxs("form", { className: "form detail-form", onSubmit: handleSubmit, children: [_jsx("div", { className: "form-grid", children: orderedFields.map(([key, label]) => renderField(key, label)) }), _jsxs("footer", { className: "form-actions", children: [_jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? '保存中…' : '保存' }), _jsx("button", { type: "button", className: "button button--ghost", onClick: handleCancelEdit, disabled: isSubmitting, children: "\u53D6\u6D88" })] })] }))] }));
};
export default PatientDetailPage;
