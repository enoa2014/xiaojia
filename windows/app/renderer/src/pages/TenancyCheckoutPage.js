import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
const TenancyCheckoutPage = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [record, setRecord] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        const load = async () => {
            if (!params.id)
                return;
            try {
                const res = await window.api.tenancies.get(params.id);
                if (res.ok) {
                    setRecord(res.data);
                }
                else {
                    setError(res.error.msg);
                }
            }
            catch (err) {
                console.error("load tenancy failed", err);
                setError("读取记录失败");
            }
        };
        load();
    }, [params.id]);
    const handleCheckout = async () => {
        if (!record)
            return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await window.api.tenancies.update({
                id: record.id,
                patch: { checkOutDate: new Date().toISOString().slice(0, 10) },
            });
            if (res.ok) {
                navigate("/tenancies");
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error("checkout failed", err);
            setError("退住失败，请稍后再试");
        }
        finally {
            setSubmitting(false);
        }
    };
    if (!record) {
        return (_jsxs("div", { className: "page", children: [_jsx("h1", { children: "\u9000\u4F4F" }), error ? _jsx("div", { className: "form__error", children: error }) : _jsx("div", { children: "\u6B63\u5728\u52A0\u8F7D\u2026" })] }));
    }
    return (_jsxs("div", { className: "page", children: [_jsx("header", { className: "page__header", children: _jsx("h1", { children: "\u9000\u4F4F\u786E\u8BA4" }) }), _jsxs("section", { className: "card", children: [_jsxs("p", { children: ["\u60A3\u8005 ID\uFF1A", record.patientId ?? "—"] }), _jsxs("p", { children: ["\u5165\u4F4F\u65E5\u671F\uFF1A", record.checkInDate] }), _jsxs("p", { children: ["\u5F53\u524D\u72B6\u6001\uFF1A", record.checkOutDate ? `已退住（${record.checkOutDate}）` : "在住"] }), error ? _jsx("div", { className: "form__error", children: error }) : null, _jsx("div", { className: "form__actions", children: _jsx("button", { type: "button", onClick: handleCheckout, disabled: submitting || !!record.checkOutDate, children: record.checkOutDate ? "已完成" : submitting ? "处理中…" : "退住" }) })] })] }));
};
export default TenancyCheckoutPage;
