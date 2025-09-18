import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
const ServiceDetailPage = () => {
    const params = useParams();
    const [record, setRecord] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        const load = async () => {
            if (!params.id)
                return;
            try {
                const res = await window.api.services.get(params.id);
                if (res.ok) {
                    setRecord(res.data);
                }
                else {
                    setError(res.error.msg);
                }
            }
            catch (err) {
                console.error("load service failed", err);
                setError("读取记录失败");
            }
        };
        load();
    }, [params.id]);
    const handleReview = async (action) => {
        if (!params.id)
            return;
        const reason = action === "reject" ? window.prompt("请输入驳回原因", "资料不完整") : undefined;
        if (action === "reject" && (!reason || reason.trim().length < 2)) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await window.api.services.review({ id: params.id, action, reason: reason?.trim() });
            if (res.ok) {
                setRecord(res.data);
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error("review service failed", err);
            setError("审批失败");
        }
        finally {
            setSubmitting(false);
        }
    };
    if (!record) {
        return (_jsxs("div", { className: "page", children: [_jsx("h1", { children: "\u670D\u52A1\u8BE6\u60C5" }), error ? _jsx("div", { className: "form__error", children: error }) : _jsx("div", { children: "\u6B63\u5728\u52A0\u8F7D\u2026" })] }));
    }
    return (_jsxs("div", { className: "page", children: [_jsx("header", { className: "page__header", children: _jsx("h1", { children: "\u670D\u52A1\u8BE6\u60C5" }) }), _jsxs("section", { className: "card", children: [_jsxs("p", { children: ["\u60A3\u8005 ID\uFF1A", record.patientId] }), _jsxs("p", { children: ["\u7C7B\u578B\uFF1A", record.type] }), _jsxs("p", { children: ["\u65E5\u671F\uFF1A", record.date] }), _jsxs("p", { children: ["\u72B6\u6001\uFF1A", record.status] }), _jsxs("p", { children: ["\u521B\u5EFA\u4EBA\uFF1A", record.createdBy ?? "—"] }), _jsxs("p", { children: ["\u63CF\u8FF0\uFF1A", record.description ?? "—"] }), _jsxs("p", { children: ["\u56FE\u7247\uFF1A", record.images.length ? record.images.join(", ") : "—"] }), error ? _jsx("div", { className: "form__error", children: error }) : null, _jsxs("div", { className: "form__actions", style: { gap: "8px" }, children: [_jsx("button", { type: "button", onClick: () => handleReview("approve"), disabled: submitting, children: "\u5BA1\u6838\u901A\u8FC7" }), _jsx("button", { type: "button", className: "button button--secondary", onClick: () => handleReview("reject"), disabled: submitting, children: "\u9A73\u56DE" })] })] })] }));
};
export default ServiceDetailPage;
