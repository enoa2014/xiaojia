import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
const ServicesPage = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const loadServices = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.api.services.list({ page: 1, pageSize: 50 });
            if (res.ok) {
                setItems(res.data.items);
            }
            else {
                setError(res.error.msg);
            }
        }
        catch (err) {
            console.error("load services failed", err);
            setError("加载服务记录失败");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadServices();
    }, []);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u670D\u52A1\u8BB0\u5F55" }), _jsx("div", { className: "page__actions", children: _jsx(Link, { to: "/services/new", className: "button", children: "\u65B0\u5EFA\u8BB0\u5F55" }) })] }), error ? _jsx("div", { className: "form__error", children: error }) : null, loading ? _jsx("div", { children: "\u6B63\u5728\u52A0\u8F7D\u670D\u52A1\u8BB0\u5F55\u2026" }) : null, !loading && !error ? (_jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u60A3\u8005 ID" }), _jsx("th", { children: "\u7C7B\u578B" }), _jsx("th", { children: "\u65E5\u671F" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: items.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.patientId }), _jsx("td", { children: item.type }), _jsx("td", { children: item.date }), _jsx("td", { children: item.status }), _jsx("td", { children: _jsx(Link, { to: `/services/${item.id}`, children: "\u67E5\u770B" }) })] }, item.id))) })] })) : null] }));
};
export default ServicesPage;
