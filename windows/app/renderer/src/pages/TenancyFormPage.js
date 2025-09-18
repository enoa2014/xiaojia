import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
const TenancyFormPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        patientId: "",
        idCard: "",
        checkInDate: new Date().toISOString().slice(0, 10),
        room: "",
        bed: "",
        subsidy: "",
        extra: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                patientId: form.patientId.trim(),
                idCard: form.idCard.trim() || null,
                checkInDate: form.checkInDate,
                room: form.room.trim() || null,
                bed: form.bed.trim() || null,
                subsidy: form.subsidy ? Number(form.subsidy) : null,
                extra: form.extra.trim() || null,
            };
            const res = await window.api.tenancies.create(payload);
            if (res.ok) {
                navigate(`/tenancies/${res.data.id}/checkout`);
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error("create tenancy failed", err);
            setError("创建失败，请稍后再试");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "page", children: [_jsx("header", { className: "page__header", children: _jsx("h1", { children: "\u65B0\u589E\u4F4F\u5BBF\u8BB0\u5F55" }) }), _jsxs("form", { className: "form", onSubmit: handleSubmit, children: [_jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u60A3\u8005 ID" }), _jsx("input", { value: form.patientId, onChange: (event) => handleChange("patientId", event.target.value), required: true })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u8EAB\u4EFD\u8BC1\u53F7" }), _jsx("input", { value: form.idCard, onChange: (event) => handleChange("idCard", event.target.value) })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u5165\u4F4F\u65E5\u671F" }), _jsx("input", { type: "date", value: form.checkInDate, onChange: (event) => handleChange("checkInDate", event.target.value), required: true })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u623F\u95F4" }), _jsx("input", { value: form.room, onChange: (event) => handleChange("room", event.target.value) })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u5E8A\u4F4D" }), _jsx("input", { value: form.bed, onChange: (event) => handleChange("bed", event.target.value) })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u8865\u8D34\u91D1\u989D" }), _jsx("input", { value: form.subsidy, onChange: (event) => handleChange("subsidy", event.target.value) })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u5907\u6CE8" }), _jsx("textarea", { value: form.extra, onChange: (event) => handleChange("extra", event.target.value) })] }), error ? _jsx("div", { className: "form__error", children: error }) : null, _jsx("div", { className: "form__actions", children: _jsx("button", { type: "submit", disabled: submitting, children: submitting ? "提交中…" : "保存" }) })] })] }));
};
export default TenancyFormPage;
