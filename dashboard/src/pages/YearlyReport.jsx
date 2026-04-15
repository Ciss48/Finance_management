import { useState, useEffect } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, ReferenceLine,
} from "recharts";
import { getYearlyStats } from "../api";
import { fmt, fmtShort, getCatColor } from "../utils";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.dataKey === "balance" && p.value > 0 ? "+" : ""}{fmtShort(p.value)}đ
        </div>
      ))}
    </div>
  );
}

const MONTH_LABELS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

export default function YearlyReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    getYearlyStats(year).then(setData).finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    if (data?.categories) {
      setActiveCategories(new Set(data.categories.map((c) => c.name)));
    }
  }, [data]);

  const toggleCategory = (name) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const monthlyChart = (data?.monthly || []).map((m, i) => ({
    ...m,
    label: MONTH_LABELS[i],
    total: m.expense + m.fixed,
  }));

  const balanceChart = monthlyChart.map(m => ({
    label: m.label,
    balance: (m.income || 0) - (m.expense || 0) - (m.fixed || 0),
  }));

  const pieData = (data?.categories || [])
    .filter((c) => activeCategories.has(c.name))
    .slice(0, 8)
    .map((c, i) => ({
      ...c, fill: getCatColor(c.name, i),
    }));

  const barData = (data?.categories || [])
    .filter((c) => activeCategories.has(c.name))
    .slice(0, 7)
    .map((c, i) => ({
      ...c, fill: getCatColor(c.name, i),
    }));

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Báo cáo theo năm</h1>
          <p className="page-sub">Tổng kết chi tiêu & thu nhập cả năm</p>
        </div>
        <select className="filter-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </header>

      {loading ? (
        <div className="full-center"><div className="spinner" /></div>
      ) : (
        <div style={{ padding: "16px 32px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* KPI */}
          <div className="cards-grid-3">
            <div className="stat-card" style={{ "--card-accent": "var(--red)" }}>
              <div className="stat-card-top"><span className="stat-icon">💸</span><span className="stat-label">Tổng chi</span></div>
              <div className="stat-value">{fmt(data?.total_spending || 0)}</div>
              <div className="stat-sub">Cố định: {fmt(data?.total_fixed || 0)}</div>
            </div>
            <div className="stat-card" style={{ "--card-accent": "var(--green)" }}>
              <div className="stat-card-top"><span className="stat-icon">💰</span><span className="stat-label">Tổng thu</span></div>
              <div className="stat-value">{fmt(data?.total_income || 0)}</div>
            </div>
            <div className="stat-card" style={{ "--card-accent": "var(--accent)" }}>
              <div className="stat-card-top"><span className="stat-icon">📊</span><span className="stat-label">Số dư</span></div>
              <div className="stat-value" style={{ color: (data?.balance || 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                {fmt(data?.balance || 0)}
              </div>
            </div>
          </div>

          {/* Monthly trend */}
          <div className="card">
            <div className="section-header"><h2>Chi tiêu theo tháng — {year}</h2></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Tổng chi" fill="var(--red)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="total" position="top" formatter={(v) => v > 0 ? fmtShort(v) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
                </Bar>
                <Bar dataKey="income" name="Thu nhập" fill="var(--green)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="income" position="top" formatter={(v) => v > 0 ? fmtShort(v) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Balance chart */}
          <div className="card">
            <div className="section-header"><h2>Số dư theo tháng — {year}</h2></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={balanceChart} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
                <Bar dataKey="balance" name="Số dư" radius={[4, 4, 0, 0]}>
                  {balanceChart.map((entry, i) => (
                    <Cell key={i} fill={entry.balance >= 0 ? "var(--green)" : "var(--red)"} />
                  ))}
                  <LabelList dataKey="balance" position="top" formatter={(v) => v !== 0 ? (v > 0 ? "+" : "") + fmtShort(Math.abs(v)) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category filter chips */}
          {(data?.categories || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {data.categories.map((c) => {
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Top categories bar */}
            <div className="card">
              <div className="section-header"><h2>Top danh mục chi tiêu</h2></div>
              {barData.length === 0 ? <div className="empty-state">Không có dữ liệu</div> : (
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
              {pieData.length === 0 ? <div className="empty-state">Không có dữ liệu</div> : (
                <div className="pie-row" style={{ alignItems: "flex-start", paddingTop: 8 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="total" paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} />
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
