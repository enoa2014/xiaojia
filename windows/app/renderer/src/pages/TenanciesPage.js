import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
const TenanciesPage = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const loadTenancies = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.api.tenancies.list({ page: 1, pageSize: 50 });
            if (res.ok) {
                setItems(res.data.items);
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error("load tenancies failed", err);
            setError("加载住宿记录失败");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadTenancies();
    }, []);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u4F4F\u5BBF\u8BB0\u5F55" }), _jsx("div", { className: "page__actions", children: _jsx(Link, { to: "/tenancies/new", className: "button", children: "\u65B0\u5EFA\u4F4F\u5BBF" }) })] }), error ? _jsx("div", { className: "form__error", children: error }) : null, loading ? _jsx("div", { children: "\u6B63\u5728\u52A0\u8F7D\u4F4F\u5BBF\u6570\u636E\u2026" }) : null, !loading && !error ? (_jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u60A3\u8005 ID" }), _jsx("th", { children: "\u5165\u4F4F\u65E5\u671F" }), _jsx("th", { children: "\u9000\u4F4F\u65E5\u671F" }), _jsx("th", { children: "\u623F\u95F4" }), _jsx("th", { children: "\u5E8A\u4F4D" }), _jsx("th", { children: "\u8865\u8D34" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: items.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.patientId ?? "—" }), _jsx("td", { children: item.checkInDate }), _jsx("td", { children: item.checkOutDate ?? "在住" }), _jsx("td", { children: item.room ?? "—" }), _jsx("td", { children: item.bed ?? "—" }), _jsx("td", { children: item.subsidy == null ? "—" : item.subsidy }), _jsx("td", { children: _jsx(Link, { to: `/tenancies/${item.id}/checkout`, children: "\u9000\u4F4F" }) })] }, item.id))) })] })) : null] }));
};
export default TenanciesPage;
