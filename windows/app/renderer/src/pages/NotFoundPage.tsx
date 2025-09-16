import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="page page--center">
    <h1>页面不存在</h1>
    <p>暂未实现该页面的桌面版，请返回首页。</p>
    <Link to="/" className="button">返回首页</Link>
  </div>
);

export default NotFoundPage;
