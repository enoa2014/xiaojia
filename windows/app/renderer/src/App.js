import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import RegistrationsPage from './pages/RegistrationsPage';
import RegistrationDetailPage from './pages/RegistrationDetailPage';
import PatientDetailPage from './pages/PatientDetailPage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import TenanciesPage from './pages/TenanciesPage';
import TenancyFormPage from './pages/TenancyFormPage';
import TenancyCheckoutPage from './pages/TenancyCheckoutPage';
import ServicesPage from './pages/ServicesPage';
import ServiceFormPage from './pages/ServiceFormPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import StatsPage from './pages/StatsPage';
import ExportsPage from './pages/ExportsPage';
import PermissionRequestPage from './pages/PermissionRequestPage';
import PermissionApprovalsPage from './pages/PermissionApprovalsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import NotFoundPage from './pages/NotFoundPage';
import AuthRegisterPage from './pages/AuthRegisterPage';
import UserRegistrationsPage from './pages/UserRegistrationsPage';
const App = () => {
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    useEffect(() => {
        const bootstrap = async () => {
            try {
                await window.api.ping();
                setStatus('ready');
            }
            catch (err) {
                console.error('Failed to bootstrap desktop bridge', err);
                setError('无法连接到本地服务，请检查 Electron 启动日志。');
                setStatus('error');
            }
        };
        bootstrap();
    }, []);
    if (status === 'loading') {
        return _jsx("div", { className: "page page--center", children: "\u6B63\u5728\u521D\u59CB\u5316\u672C\u5730\u670D\u52A1\u2026" });
    }
    if (status === 'error') {
        return (_jsxs("div", { className: "page page--center", children: [_jsx("h1", { children: "\u52A0\u8F7D\u5931\u8D25" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: () => window.location.reload(), children: "\u91CD\u8BD5" })] }));
    }
    return (_jsxs("div", { className: "layout", children: [_jsxs("nav", { className: "sidebar", children: [_jsx("h2", { children: "\u5BFC\u822A" }), _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/auth/register", children: "\u8D26\u53F7\u4E2D\u5FC3" }) }), _jsx("li", { children: _jsx(Link, { to: "/services", children: "\u670D\u52A1\u8BB0\u5F55" }) }), _jsx("li", { children: _jsx(Link, { to: "/permissions/apply", children: "\u8D44\u6599\u7533\u8BF7" }) }), _jsx("li", { children: _jsx(Link, { to: "/approvals", children: "\u6743\u9650\u5BA1\u6279" }) }), _jsx("li", { children: _jsx(Link, { to: "/user-registrations", children: "\u8D26\u53F7\u5BA1\u6838" }) }), _jsx("li", { children: _jsx(Link, { to: "/stats", children: "\u6570\u636E\u7EDF\u8BA1" }) }), _jsx("li", { children: _jsx(Link, { to: "/exports", children: "\u6570\u636E\u5BFC\u51FA" }) }), _jsx("li", { children: _jsx(Link, { to: "/audits", children: "\u5BA1\u8BA1\u65E5\u5FD7" }) })] })] }), _jsx("main", { className: "content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/patients", element: _jsx(PatientsPage, {}) }), _jsx(Route, { path: "/patients/:id", element: _jsx(PatientDetailPage, {}) }), _jsx(Route, { path: "/activities", element: _jsx(ActivitiesPage, {}) }), _jsx(Route, { path: "/activities/:id", element: _jsx(ActivityDetailPage, {}) }), _jsx(Route, { path: "/registrations", element: _jsx(RegistrationsPage, {}) }), _jsx(Route, { path: "/registrations/:id", element: _jsx(RegistrationDetailPage, {}) }), _jsx(Route, { path: "/tenancies", element: _jsx(TenanciesPage, {}) }), _jsx(Route, { path: "/tenancies/new", element: _jsx(TenancyFormPage, {}) }), _jsx(Route, { path: "/tenancies/:id/checkout", element: _jsx(TenancyCheckoutPage, {}) }), _jsx(Route, { path: "/services", element: _jsx(ServicesPage, {}) }), _jsx(Route, { path: "/services/new", element: _jsx(ServiceFormPage, {}) }), _jsx(Route, { path: "/services/:id", element: _jsx(ServiceDetailPage, {}) }), _jsx(Route, { path: "/auth/register", element: _jsx(AuthRegisterPage, {}) }), _jsx(Route, { path: "/user-registrations", element: _jsx(UserRegistrationsPage, {}) }), _jsx(Route, { path: "/approvals", element: _jsx(PermissionApprovalsPage, {}) }), _jsx(Route, { path: "/stats", element: _jsx(StatsPage, {}) }), _jsx(Route, { path: "/exports", element: _jsx(ExportsPage, {}) }), _jsx(Route, { path: "/permissions/apply", element: _jsx(PermissionRequestPage, {}) }), _jsx(Route, { path: "/audits", element: _jsx(AuditLogsPage, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] }) })] }));
};
export default App;
