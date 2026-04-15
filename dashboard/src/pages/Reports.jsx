import { useState, useEffect } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList,
} from "recharts";
import { getMonthlyStats, getDailyCategoryStats, getCategoryStats } from "../api";
import { fmt, fmtShort, COLORS, getCatColor, currentMonth } from "../utils";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.filter((p) => p.value > 0).map((p, i) => (
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

const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

export default function Reports() {
  const [month, setMonth] = useState(currentMonth());
  const [monthly, setMonthly] = useState(null);
  const [daily, setDaily] = useState([]);
  const [catStats, setCatStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    Promise.all([getMonthlyStats(month), getDailyCategoryStats(month), getCategoryStats(month)])
      .then(([m, d, c]) => { setMonthly(m); setDaily(d); setCatStats(c); })
      .finally(() => setLoading(false));
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

  const allDailyCategories = daily.length > 0
    ? Object.keys(daily[0]).filter((k) => k !== "date" && k !== "label")
    : [];
  const dailyCategories = allDailyCategories.filter((k) => activeCategories.has(k));

  const pieData = (catStats?.categories || [])
    .filter((c) => activeCategories.has(c.name))
    .map((c, i) => ({
      name: c.name, value: c.total, percentage: c.percentage, icon: c.icon, fill: getCatColor(c.name, i),
    }));

  const barData = (catStats?.categories || [])
    .filter((c) => activeCategories.has(c.name))
    .slice(0, 7)
    .map((c, i) => ({
      name: c.name, total: c.total, fill: getCatColor(c.name, i),
    }));

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Báo cáo chi tiết</h1>
          <p className="page-sub">Phân tích chi tiêu theo tháng</p>
        </div>
        <select className="filter-input" value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </header>

      {loading ? (
        <div className="full-center"><div className="spinner" /></div>
      ) : (
        <div style={{ padding: "16px 32px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary row */}
          <div className="cards-grid-3">
            <div className="stat-card" style={{ "--card-accent": "var(--red)" }}>
              <div className="stat-card-top"><span className="stat-icon">💸</span><span className="stat-label">Tổng chi</span></div>
              <div className="stat-value">{fmt((monthly?.total_fixed || 0) + (monthly?.total_expense || 0))}</div>
              <div className="stat-sub">Cố định: {fmt(monthly?.total_fixed || 0)}</div>
            </div>
            <div className="stat-card" style={{ "--card-accent": "var(--green)" }}>
              <div className="stat-card-top"><span className="stat-icon">💰</span><span className="stat-label">Tổng thu</span></div>
              <div className="stat-value">{fmt(monthly?.total_income || 0)}</div>
            </div>
            <div className="stat-card" style={{ "--card-accent": "var(--accent)" }}>
              <div className="stat-card-top"><span className="stat-icon">📊</span><span className="stat-label">Số dư</span></div>
              {(() => {
                const balance = (monthly?.total_income || 0) - (monthly?.total_fixed || 0) - (monthly?.total_expense || 0);
                return (
                  <div className="stat-value" style={{ color: balance >= 0 ? "var(--green)" : "var(--red)" }}>
                    {fmt(balance)}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Category filter chips */}
          {(catStats?.categories || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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

          {/* Daily trend — stacked by category */}
          <div className="card">
            <div className="section-header"><h2>Chi tiêu theo ngày — {month}</h2></div>
            {daily.length === 0 ? (
              <div className="empty-state">Không có dữ liệu tháng này</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {dailyCategories.map((cat, i) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={getCatColor(cat, i)} radius={i === dailyCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Category bar */}
            <div className="card">
              <div className="section-header"><h2>Top danh mục chi tiêu</h2></div>
              {barData.length === 0 ? (
                <div className="empty-state">Không có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 52, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Chi tiêu" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      <LabelList dataKey="total" position="right" formatter={fmtShort} style={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie */}
            <div className="card">
              <div className="section-header"><h2>Tỷ lệ danh mục</h2></div>
              {pieData.length === 0 ? (
                <div className="empty-state">Không có dữ liệu</div>
              ) : (
                <div className="pie-row" style={{ alignItems: "flex-start", paddingTop: 8 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="value" paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {pieData.map((d, i) => (
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
        </div>
      )}
    </>
  );
}
