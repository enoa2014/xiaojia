import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
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
        setError('无法连接到本地服务。请检查 Electron 主进程日志。');
        setStatus('error');
      }
    };

    bootstrap();
  }, []);

  if (status === 'loading') {
    return <div className="page page--center">正在加载桌面环境…</div>;
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
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
