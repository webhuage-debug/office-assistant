import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="card">
        <h1 className="page-title">页面不存在</h1>
        <p className="page-description">你访问的页面可能被移动或删除了。</p>
        <Link className="button" to="/">
          返回工作台
        </Link>
      </div>
    </div>
  );
}
