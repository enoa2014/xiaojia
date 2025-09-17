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

const App = () => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await window.api.ping();
        setStatus('ready');
      } catch (err) {
        console.error('Failed to bootstrap desktop bridge', err);
        setError('无法连接到本地服务，请检查 Electron 启动日志。');
        setStatus('error');
      }
    };

    bootstrap();
  }, []);

  if (status === 'loading') {
    return <div className="page page--center">正在初始化本地服务…</div>;
  }

  if (status === 'error') {
    return (
      <div className="page page--center">
        <h1>加载失败</h1>
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="layout">
      <nav className="sidebar">
        <h2>导航</h2>
        <ul>
          <li>
            <Link to="/services">服务记录</Link>
          </li>
          <li>
            <Link to="/permissions/apply">资料申请</Link>
          </li>
          <li>
            <Link to="/approvals">权限审批</Link>
          </li>
          <li>
            <Link to="/stats">数据统计</Link>
          </li>
          <li>
            <Link to="/exports">数据导出</Link>
          </li>
          <li>
            <Link to="/audits">审计日志</Link>
          </li>
        </ul>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/activities/:id" element={<ActivityDetailPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/registrations/:id" element={<RegistrationDetailPage />} />
          <Route path="/tenancies" element={<TenanciesPage />} />
          <Route path="/tenancies/new" element={<TenancyFormPage />} />
          <Route path="/tenancies/:id/checkout" element={<TenancyCheckoutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/new" element={<ServiceFormPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          <Route path="/approvals" element={<PermissionApprovalsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/exports" element={<ExportsPage />} />
          <Route path="/permissions/apply" element={<PermissionRequestPage />} />
          <Route path="/audits" element={<AuditLogsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

