import { NavLink, Outlet } from "react-router-dom";

const navLinks = [
  { to: "/", label: "工作台" },
  { to: "/projects", label: "项目列表" },
  { to: "/projects/new", label: "新建项目" },
  { to: "/cad", label: "CAD工作台" },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-brand">全屋智能办公助手</div>
          <div className="app-brand-subtitle">本地桌面版 · 项目管理 / 报价 / CAD 底座 / 备份</div>
        </div>

        <nav className="app-nav" aria-label="主导航">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `app-nav-link${isActive ? " app-nav-link-active" : ""}`}
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
