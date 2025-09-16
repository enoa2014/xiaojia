import { useEffect, useState } from 'react';

const HomePage = () => {
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  useEffect(() => {
    const loadMeta = async () => {
      const stored = await window.api.getMeta('last-opened');
      setLastOpened(stored);
      await window.api.setMeta('last-opened', new Date().toISOString());
    };

    loadMeta().catch((err) => {
      console.error('Failed to read/write meta table', err);
    });
  }, []);

  return (
    <div className="page">
      <header className="page__header">
        <h1>小家桌面版</h1>
        <p>此窗口用于验证 Electron 与 SQLite 管道是否连通。</p>
      </header>

      <section className="card">
        <h2>最近一次打开</h2>
        <p>{lastOpened ? new Date(lastOpened).toLocaleString() : '首次启动或尚未记录。'}</p>
      </section>

      <section className="card">
        <h2>下一步行动</h2>
        <ul>
          <li>迁移「患者管理」「活动管理」等页面组件。</li>
          <li>将云函数中的业务逻辑适配为本地 SQLite 操作。</li>
          <li>完善主题/样式生成流程，复用现有设计 Tokens。</li>
        </ul>
      </section>
    </div>
  );
};

export default HomePage;
