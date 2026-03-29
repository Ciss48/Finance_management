import { NavLink, Outlet } from "react-router-dom";
import { currentMonth } from "./utils";

const NAV = [
  { to: "/", label: "Tổng quan", icon: "📊" },
  { to: "/transactions", label: "Giao dịch", icon: "💳" },
  { to: "/categories", label: "Danh mục", icon: "🗂️" },
  { to: "/reports", label: "Báo cáo theo tháng", icon: "📈" },
  { to: "/yearly", label: "Báo cáo theo năm", icon: "📅" },
];

export default function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">💎</span>
          <span className="logo-text">FinanceOS</span>
        </div>
        <nav className="nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-month">
          <div className="month-label">Tháng hiện tại</div>
          <div className="month-value">{currentMonth()}</div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
