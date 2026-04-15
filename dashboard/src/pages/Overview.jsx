import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, ReferenceLine,
} from "recharts";
import { getMonthlyStats, getDailyStats, getDailyCategoryStats, getCategoryStats, getTransactions, deleteTransaction } from "../api";
import { fmt, fmtShort, getCatColor, currentMonth } from "../utils";

const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card" style={{ "--card-accent": color || "var(--accent)" }}>
      <div className="stat-card-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmtShort(p.value)}đ</div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tooltip">
      <div>{d.payload.icon} {d.name}</div>
      <div style={{ color: d.payload.fill }}>{fmt(d.value)} ({d.payload.percentage}%)</div>
    </div>
  );
}

const CustomBar = (props) => {
  const { x, y, width, height, isToday } = props;
  if (!height || height <= 0) return null;
  const fill = isToday ? "var(--accent)" : "#4d6aaa";
  const r = 4;
  return (
    <g>
      {isToday && (
        <rect x={x - 3} y={y - 5} width={width + 6} height={height + 5} rx={6}
          fill="var(--accent)" opacity={0.18} />
      )}
      <rect x={x} y={y} width={width} height={height} rx={r} fill={fill} />
      <rect x={x} y={y + height - r} width={width} height={r} fill={fill} />
      {isToday && (
        <rect x={x} y={y} width={width} height={2} rx={1} fill="#fff" opacity={0.3} />
      )}
    </g>
  );
};

export default function Overview() {
  const [month, setMonth] = useState(currentMonth);
  const [budget, setBudget] = useState(0);
  const [monthly, setMonthly] = useState(null);
  const [daily, setDaily] = useState([]);
  const [dailyByCat, setDailyByCat] = useState([]);
  const [catStats, setCatStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategories, setActiveCategories] = useState(new Set());

  const today = new Date();
  const todayStr = today.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, d, dc, c, t] = await Promise.all([
        getMonthlyStats(month), getDailyStats(month), getDailyCategoryStats(month), getCategoryStats(month), getTransactions({ limit: 30, month }),
      ]);
      setMonthly(m); setDaily(d); setDailyByCat(dc); setCatStats(c); setTransactions(t);
    } catch {
      setError("Không thể kết nối API. Kiểm tra backend có đang chạy không.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const saved = localStorage.getItem("budget_" + month);
    setBudget(saved ? Number(saved) : 0);
  }, [month]);

  useEffect(() => {
    if (catStats?.categories) {
      setActiveCategories(new Set(catStats.categories.map((c) => c.name)));
    }
  }, [catStats]);

  const toggleCategory = (name) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa giao dịch này?")) return;
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    load();
  };

  if (loading) return <div className="full-center"><div className="spinner" /></div>;
  if (error) return <div className="full-center error-msg">{error}</div>;

  const pieData = (catStats?.categories || []).map((c, i) => ({
    name: c.name, value: c.total, percentage: c.percentage, icon: c.icon, fill: getCatColor(c.name, i),
  }));

  const todayDate = currentMonth() === month ? new Date().toISOString().slice(0, 10) : null;
  const dailyChartData = (dailyByCat.length > 0 ? dailyByCat : daily).map((d) => {
    const filteredExpense = dailyByCat.length > 0
      ? Object.entries(d)
          .filter(([k]) => k !== "date" && k !== "label" && activeCategories.has(k))
          .reduce((sum, [, v]) => sum + v, 0)
      : d.expense;
    return { ...d, expense: filteredExpense, isToday: d.date === todayDate, label: d.date.slice(8, 10) };
  });

  const totalExpense = (monthly?.total_fixed || 0) + (monthly?.total_expense || 0);
  const hasData = daily.length > 0 || (catStats?.categories?.length > 0);

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Tổng quan</h1>
          <p className="page-sub">{todayStr}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select className="filter-input" value={month} onChange={(e) => { setMonth(e.target.value); setLoading(true); }}>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="refresh-btn" onClick={load}>↻ Làm mới</button>
        </div>
      </header>

      <div style={{ padding: "0 32px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>💰 Ngân sách tháng:</span>
        <input
          type="number"
          placeholder="Nhập ngân sách..."
          value={budget || ""}
          onChange={(e) => { const v = Number(e.target.value); setBudget(v); localStorage.setItem("budget_" + month, v); }}
          className="filter-input"
          style={{ width: 160 }}
        />
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>đ</span>
      </div>

      {/* Hero: Tổng chi */}
      <div className="hero-kpi-wrap">
        <div className="hero-stat-card">
          <div className="hero-stat-icon">💸</div>
          <div className="hero-stat-body">
            <div className="hero-stat-label">Tổng chi — {month}</div>
            <div className="hero-stat-value">{fmt(totalExpense)}</div>
            <div className="hero-stat-breakdown">
              <span className="breakdown-item">
                <span className="breakdown-dot" style={{ background: "var(--accent)" }} />
                Chi biến động: {fmt(monthly?.total_expense || 0)}
              </span>
              <span className="breakdown-item">
                <span className="breakdown-dot" style={{ background: "var(--yellow)" }} />
                Chi cố định: {fmt(monthly?.total_fixed || 0)}
              </span>
              {(monthly?.total_income || 0) > 0 && (
                <span className="breakdown-item">
                  <span className="breakdown-dot" style={{ background: "var(--green)" }} />
                  Thu nhập: {fmt(monthly?.total_income || 0)}
                </span>
              )}
            </div>
          </div>
          {(monthly?.total_income || 0) > 0 && (
            <div className="hero-stat-balance">
              <div className="hero-balance-label">Số dư</div>
              <div className="hero-balance-value" style={{
                color: (monthly.total_income - totalExpense) >= 0 ? "var(--green)" : "var(--red)"
              }}>
                {fmt(monthly.total_income - totalExpense)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="cards-grid-4">
        <StatCard label="Hôm nay" value={fmt(monthly?.today_expense || 0)} icon="📅" color="var(--accent)" />
        <StatCard label="Tuần này" value={fmt(monthly?.week_expense || 0)} icon="📆" color="#a78bfa" />
        <StatCard label="Tháng này" value={fmt(monthly?.total_expense || 0)} sub={`Thu nhập: ${fmt(monthly?.total_income || 0)}`} icon="📊" color="var(--green)" />
        <StatCard label="Chi phí cố định" value={fmt(monthly?.total_fixed || 0)} sub="Tiền nhà, gym, v.v." icon="🔒" color="var(--yellow)" />
      </div>

      {!hasData ? (
        <div className="no-data-state">
          <div className="no-data-icon">📭</div>
          <div className="no-data-text">Không có dữ liệu cho tháng {month}</div>
        </div>
      ) : (
        <>
          <div className="charts-row">
            <div className="card chart-card">
              <div className="section-header"><h2>Chi tiêu theo ngày</h2></div>
              {(catStats?.categories || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {catStats.categories.map((c) => {
                    const active = activeCategories.has(c.name);
                    return (
                      <button
                        key={c.name}
                        onClick={() => toggleCategory(c.name)}
                        style={{
                          padding: "4px 10px", fontSize: 12, borderRadius: 999,
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                          background: "var(--card)", color: "var(--text-secondary)",
                          cursor: "pointer", opacity: active ? 1 : 0.4,
                          transition: "opacity 0.15s, border-color 0.15s",
                        }}
                      >
                        {c.icon} {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyChartData} margin={{ top: 22, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  {budget > 0 && (
                    <ReferenceLine y={budget} stroke="var(--yellow)" strokeDasharray="4 4" label={{ value: fmtShort(budget) + "đ", position: "right", fill: "var(--yellow)", fontSize: 11 }} />
                  )}
                  <Bar dataKey="expense" name="Chi tiêu" shape={<CustomBar />}>
                    <LabelList
                      dataKey="expense"
                      position="top"
                      formatter={(v) => v > 0 ? fmtShort(v) : ""}
                      style={{ fill: "var(--text-muted)", fontSize: 10 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card chart-card">
              <div className="section-header"><h2>Theo danh mục</h2></div>
              {pieData.length === 0 ? (
                <div className="empty-state">Chưa có dữ liệu tháng này</div>
              ) : (
                <div className="pie-row">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {pieData.slice(0, 6).map((d, i) => (
                      <div key={i} className="legend-item">
                        <span className="legend-dot" style={{ background: d.fill }} />
                        <span className="legend-name">{d.icon} {d.name}</span>
                        <span className="legend-pct">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bottom-row">
            <div className="card txn-card">
              <div className="section-header"><h2>Giao dịch gần đây</h2></div>
              <div className="txn-list">
                {transactions.length === 0 && <div className="empty-state">Chưa có giao dịch nào</div>}
                {transactions.map((t) => (
                  <div key={t.id} className="txn-item">
                    <div className="txn-icon">{t.categories?.icon || "📦"}</div>
                    <div className="txn-info">
                      <div className="txn-cat">{t.categories?.name || "Khác"}</div>
                      {t.note && <div className="txn-note">{t.note}</div>}
                      <div className="txn-time">{new Date(t.created_at).toLocaleString("vi-VN")}</div>
                    </div>
                    <div className={`txn-amount ${t.type === "income" ? "income" : "expense"}`}>
                      {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                    </div>
                    <button className="txn-delete" onClick={() => handleDelete(t.id)} title="Xóa">×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card fixed-card">
              <div className="section-header"><h2>Chi phí cố định tháng này</h2></div>
              {(!monthly?.fixed_costs || monthly.fixed_costs.length === 0) ? (
                <div className="empty-state">Chưa có chi phí cố định</div>
              ) : (
                <>
                  <div className="fixed-list">
                    {monthly.fixed_costs.map((fc, i) => (
                      <div key={i} className="fixed-item">
                        <span className="fixed-icon">{fc.categories?.icon || "🔒"}</span>
                        <span className="fixed-name">{fc.categories?.name || "?"}</span>
                        <span className="fixed-amount">{fmt(fc.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="fixed-total">
                    <span>Tổng cố định</span>
                    <span className="fixed-total-val">{fmt(monthly.total_fixed)}</span>
                  </div>
                  <div className="fixed-bar-row">
                    <div className="fixed-bar-label">
                      <span style={{ color: "var(--yellow)" }}>● Cố định</span>
                      <span style={{ color: "var(--accent)" }}>● Biến động</span>
                    </div>
                    {(() => {
                      const total = (monthly.total_fixed || 0) + (monthly.total_expense || 0);
                      const fixedPct = total > 0 ? (monthly.total_fixed / total) * 100 : 0;
                      return (
                        <div className="split-bar">
                          <div className="split-fixed" style={{ width: `${fixedPct}%` }} />
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
