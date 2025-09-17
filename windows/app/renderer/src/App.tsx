import { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import RegistrationsPage from './pages/RegistrationsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import ActivityDetailPage from './pages/ActivityDetailPage';
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
        setError('无法连接到本地服务，请检查 Electron 主进程日志。');
        setStatus('error');
      }
    };

    bootstrap();
  }, []);

  if (status === 'loading') {
    return <div className="page page--center">正在连接桌面服务…</div>;
  }

  if (status === 'error') {
    return (
      <div className="page page--center">
        <h1>启动失败</h1>
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>重试</button>
      </div>
    );
  }

  return (
    <div className="layout">
      <nav className="sidebar">
        <h2>导航</h2>
        <ul>
          <li>
            <Link to="/">小家概览</Link>
          </li>
          <li>
            <Link to="/patients">患者列表</Link>
          </li>
          <li>
            <Link to="/activities">活动列表</Link>
          </li>
          <li>
            <Link to="/registrations">报名记录</Link>
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
