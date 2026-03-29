import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { getMonthlyStats, getDailyStats, getCategoryStats, getTransactions, deleteTransaction } from "../api";
import { fmt, fmtShort, COLORS, currentMonth } from "../utils";

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

export default function Overview() {
  const [monthly, setMonthly] = useState(null);
  const [daily, setDaily] = useState([]);
  const [catStats, setCatStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date();
  const todayStr = today.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, d, c, t] = await Promise.all([
        getMonthlyStats(), getDailyStats(), getCategoryStats(), getTransactions({ limit: 30 }),
      ]);
      setMonthly(m); setDaily(d); setCatStats(c); setTransactions(t);
    } catch {
      setError("Không thể kết nối API. Kiểm tra backend có đang chạy không.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Xóa giao dịch này?")) return;
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    load();
  };

  if (loading) return <div className="full-center"><div className="spinner" /></div>;
  if (error) return <div className="full-center error-msg">{error}</div>;

  const pieData = (catStats?.categories || []).map((c, i) => ({
    name: c.name, value: c.total, percentage: c.percentage, icon: c.icon, fill: COLORS[i % COLORS.length],
  }));

  const todayDate = new Date().toISOString().slice(0, 10);
  const dailyChartData = daily.map((d) => ({ ...d, isToday: d.date === todayDate, label: d.date.slice(8, 10) }));

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Tổng quan</h1>
          <p className="page-sub">{todayStr}</p>
        </div>
        <button className="refresh-btn" onClick={load}>↻ Làm mới</button>
      </header>

      <div className="cards-grid">
        <StatCard label="Hôm nay" value={fmt(monthly?.today_expense || 0)} icon="📅" color="var(--accent)" />
        <StatCard label="Tuần này" value={fmt(monthly?.week_expense || 0)} icon="📆" color="#a78bfa" />
        <StatCard label="Tháng này" value={fmt(monthly?.total_expense || 0)} sub={`Thu nhập: ${fmt(monthly?.total_income || 0)}`} icon="📊" color="var(--green)" />
        <StatCard label="Chi phí cố định" value={fmt(monthly?.total_fixed || 0)} sub="Tiền nhà, gym, v.v." icon="🔒" color="var(--yellow)" />
        <StatCard
          label="Tổng chi"
          value={fmt((monthly?.total_fixed || 0) + (monthly?.total_expense || 0))}
          sub={`Cố định: ${fmt(monthly?.total_fixed || 0)}`}
          icon="💸"
          color="var(--red)"
        />
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <div className="section-header"><h2>Chi tiêu theo ngày</h2></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="expense" name="Chi tiêu" radius={[4, 4, 0, 0]}>
                {dailyChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isToday ? "var(--accent)" : "#4d6aaa"} />
                ))}
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
  );
}
