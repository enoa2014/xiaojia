import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
const ServiceFormPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        patientId: "",
        type: "陪护",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        images: "",
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
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
                type: form.type.trim() || "其他",
                date: form.date,
                description: form.description.trim() || null,
                images: form.images
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
            };
            const res = await window.api.services.create(payload);
            if (res.ok) {
                navigate(`/services/${res.data.id}`);
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error("create service failed", err);
            setError("保存失败，请稍后再试");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "page", children: [_jsx("header", { className: "page__header", children: _jsx("h1", { children: "\u65B0\u589E\u670D\u52A1\u8BB0\u5F55" }) }), _jsxs("form", { className: "form", onSubmit: handleSubmit, children: [_jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u60A3\u8005 ID" }), _jsx("input", { value: form.patientId, onChange: (event) => handleChange("patientId", event.target.value), required: true })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u670D\u52A1\u7C7B\u578B" }), _jsx("input", { value: form.type, onChange: (event) => handleChange("type", event.target.value), required: true })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u670D\u52A1\u65E5\u671F" }), _jsx("input", { type: "date", value: form.date, onChange: (event) => handleChange("date", event.target.value), required: true })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u63CF\u8FF0" }), _jsx("textarea", { value: form.description, onChange: (event) => handleChange("description", event.target.value) })] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u56FE\u7247\uFF08\u9017\u53F7\u5206\u9694\uFF09" }), _jsx("input", { value: form.images, onChange: (event) => handleChange("images", event.target.value) })] }), error ? _jsx("div", { className: "form__error", children: error }) : null, _jsx("div", { className: "form__actions", children: _jsx("button", { type: "submit", disabled: submitting, children: submitting ? "提交中…" : "保存" }) })] })] }));
};
export default ServiceFormPage;
