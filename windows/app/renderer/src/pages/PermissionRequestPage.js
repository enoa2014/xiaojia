import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
const FIELD_OPTIONS = [
    { key: 'id_card', label: '证件信息', description: '身份证号及尾号' },
    { key: 'phone', label: '联系方式', description: '预留手机号' },
    { key: 'diagnosis', label: '病历摘要', description: '诊断与治疗关键信息' },
];
const EXPIRES_OPTIONS = [30, 60, 90];
const PermissionRequestPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialPatientId = searchParams.get('patientId') ?? '';
    const [patientId, setPatientId] = useState(initialPatientId);
    const [selectedFields, setSelectedFields] = useState({
        id_card: false,
        phone: false,
        diagnosis: false,
    });
    const [reason, setReason] = useState('');
    const [expiresIndex, setExpiresIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [errorMap, setErrorMap] = useState({});
    const [successMessage, setSuccessMessage] = useState(null);
    const expiresDays = EXPIRES_OPTIONS[expiresIndex];
    const selectedList = useMemo(() => FIELD_OPTIONS.filter((item) => selectedFields[item.key]).map((item) => item.key), [selectedFields]);
    const toggleField = (field) => {
        setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
    };
    const validate = () => {
        const nextErrors = {};
        if (!patientId.trim()) {
            nextErrors.patientId = '请填写患者 ID';
        }
        if (selectedList.length === 0) {
            nextErrors.fields = '请至少选择一项资料';
        }
        if (reason.trim().length < 20) {
            nextErrors.reason = '申请理由不少于 20 个字';
        }
        setErrorMap(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validate())
            return;
        try {
            setSubmitting(true);
            setSuccessMessage(null);
            const payload = {
                patientId: patientId.trim(),
                fields: selectedList,
                reason: reason.trim(),
                expiresDays,
            };
            const response = await window.api.permissionRequests.create(payload);
            if (response.ok) {
                setSuccessMessage('申请已提交，等待审核。');
                setTimeout(() => {
                    if (initialPatientId) {
                        navigate(`/patients/${initialPatientId}`);
                    }
                }, 800);
            }
            else {
                setErrorMap({ form: response.error.msg });
            }
        }
        catch (err) {
            console.error('submit permission request failed', err);
            setErrorMap({ form: '提交失败，请稍后再试。' });
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u8D44\u6599\u67E5\u770B\u7533\u8BF7" }), _jsx("p", { children: "\u5982\u9700\u67E5\u770B\u60A3\u8005\u654F\u611F\u8D44\u6599\uFF0C\u8BF7\u63D0\u4EA4\u7533\u8BF7\u5E76\u8BF4\u660E\u7528\u9014\u3002" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "form", onSubmit: handleSubmit, children: [_jsxs("div", { className: "form__field", children: [_jsx("label", { htmlFor: "patient-id", children: "\u60A3\u8005 ID" }), _jsx("input", { id: "patient-id", type: "text", value: patientId, onChange: (event) => setPatientId(event.target.value), placeholder: "\u4F8B\u5982\uFF1Aseed-patient-001", disabled: Boolean(initialPatientId) }), errorMap.patientId ? _jsx("span", { className: "form__error", children: errorMap.patientId }) : null] }), _jsxs("div", { className: "permission-fields", children: [_jsx("span", { className: "permission-fields__label", children: "\u7533\u8BF7\u8D44\u6599" }), errorMap.fields ? _jsx("span", { className: "form__error", children: errorMap.fields }) : null, _jsx("div", { className: "permission-fields__grid", children: FIELD_OPTIONS.map((item) => (_jsxs("button", { type: "button", className: selectedFields[item.key] ? 'permission-field permission-field--active' : 'permission-field', onClick: () => toggleField(item.key), children: [_jsx("strong", { children: item.label }), _jsx("span", { children: item.description })] }, item.key))) })] }), _jsxs("div", { className: "form__field", children: [_jsx("label", { htmlFor: "reason", children: "\u7533\u8BF7\u7406\u7531" }), _jsx("textarea", { id: "reason", rows: 4, value: reason, onChange: (event) => setReason(event.target.value), placeholder: "\u8BF7\u8BF4\u660E\u7528\u9014\u548C\u4F7F\u7528\u8303\u56F4\uFF0C\u81F3\u5C11 20 \u5B57" }), errorMap.reason ? _jsx("span", { className: "form__error", children: errorMap.reason }) : null] }), _jsxs("div", { className: "form__field", children: [_jsx("label", { htmlFor: "expires", children: "\u6709\u6548\u671F" }), _jsx("select", { id: "expires", value: expiresIndex, onChange: (event) => setExpiresIndex(Number(event.target.value)), children: EXPIRES_OPTIONS.map((item, index) => (_jsxs("option", { value: index, children: [item, " \u5929"] }, item))) })] }), errorMap.form ? _jsx("div", { className: "form__error", children: errorMap.form }) : null, successMessage ? _jsx("div", { className: "form__success", children: successMessage }) : null, _jsxs("div", { className: "form__actions", children: [_jsx("button", { type: "submit", disabled: submitting, children: submitting ? '提交中…' : '提交申请' }), _jsx("button", { type: "button", className: "button button--secondary", onClick: () => navigate(-1), disabled: submitting, children: "\u8FD4\u56DE" })] })] }) })] }));
};
export default PermissionRequestPage;
