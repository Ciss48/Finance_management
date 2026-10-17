import { useState, useEffect } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList,
} from "recharts";
import {
  getMonthlyStats, getDailyCategoryStats, getCategoryStats, getWeeklyStats,
  getWeekdayStats, getCategories, getCategoryTrend, getBudgetHistory,
  getAnomalies,
} from "../api";
import { fmt, fmtShort, COLORS, getCatColor, currentMonth, prevMonthStr } from "../utils";

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

function WeeklyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.filter((p) => p.dataKey !== "__total__" && p.value > 0).map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmtShort(p.value)}đ</div>
      ))}
      <div style={{ color: "var(--green)" }}>Thu nhập: {fmtShort(d.income)}đ</div>
      {d.delta_pct !== null && d.delta_pct !== undefined && (
        <div style={{ color: d.delta_pct > 0 ? "var(--red)" : "var(--green)" }}>
          {d.delta_pct > 0 ? "+" : ""}{d.delta_pct}% so với tuần trước
        </div>
      )}
    </div>
  );
}

function WeekdayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      <div>Tổng: {fmt(d.total)}</div>
      <div>Số ngày: {d.count_days}</div>
      <div>Trung bình/ngày: {fmt(d.avg_per_day)}</div>
    </div>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      <div>Chi tiêu: {fmt(d.total)}</div>
      <div style={{ color: "var(--text-muted)" }}>Trung bình 3 tháng: {fmt(d.moving_avg)}</div>
    </div>
  );
}

function ComparisonTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const deltaPct = d.previous > 0 ? Math.round((d.current - d.previous) / d.previous * 100) : null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{d.icon} {label}</div>
      <div style={{ color: "var(--accent)" }}>Tháng này: {fmt(d.current)}</div>
      <div style={{ color: "var(--text-muted)" }}>Tháng trước: {fmt(d.previous)}</div>
      {deltaPct !== null && (
        <div style={{ color: deltaPct > 0 ? "var(--red)" : "var(--green)" }}>
          {deltaPct > 0 ? "+" : ""}{deltaPct}% so với tháng trước
        </div>
      )}
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
  const [weekly, setWeekly] = useState([]);
  const [weekdayStats, setWeekdayStats] = useState([]);
  const [catStats, setCatStats] = useState(null);
  const [prevCatStats, setPrevCatStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    getBudgetHistory().then(setBudgetHistory);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMonthlyStats(month), getDailyCategoryStats(month), getCategoryStats(month),
      getWeeklyStats(month), getWeekdayStats(month),
      getCategoryStats(prevMonthStr(month)), getAnomalies(month),
    ])
      .then(([m, d, c, w, wd, pc, a]) => {
        setMonthly(m); setDaily(d); setCatStats(c); setWeekly(w);
        setWeekdayStats(wd); setPrevCatStats(pc); setAnomalies(a);
      })
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    if (catStats?.categories) {
      setActiveCategories(new Set(catStats.categories.map((c) => c.name)));
    }
  }, [catStats]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const dailyCategoryOptions = categories.filter((c) => c.type === "daily");

  useEffect(() => {
    if (!selectedCategoryId && dailyCategoryOptions.length > 0) {
      setSelectedCategoryId(dailyCategoryOptions[0].id);
    }
  }, [dailyCategoryOptions, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    getCategoryTrend(selectedCategoryId).then(setTrendData);
  }, [selectedCategoryId]);

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

  const dailyWithTotal = daily.map((d) => ({
    ...d,
    __total__: dailyCategories.reduce((sum, k) => sum + (d[k] || 0), 0),
  }));

  const WEEKLY_FIXED_KEYS = ["week_start", "week_end", "label", "expense", "income", "delta_pct"];
  const allWeeklyCategories = weekly.length > 0
    ? Object.keys(weekly[0]).filter((k) => !WEEKLY_FIXED_KEYS.includes(k))
    : [];
  const weeklyCategories = allWeeklyCategories.filter((k) => activeCategories.has(k));

  const weeklyWithTotal = weekly.map((w) => ({
    ...w,
    __total__: weeklyCategories.reduce((sum, k) => sum + (w[k] || 0), 0),
  }));

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

  const comparisonData = (catStats?.categories || [])
    .slice(0, 7)
    .map((c) => {
      const prev = (prevCatStats?.categories || []).find((p) => p.name === c.name);
      return { name: c.name, current: c.total, previous: prev?.total || 0, icon: c.icon };
    });

  const selectedCategory = dailyCategoryOptions.find((c) => c.id === selectedCategoryId);
  const trendHasData = (trendData?.series || []).some((p) => p.total > 0);

  // Burn-rate: dự báo cuối tháng, chỉ có ý nghĩa cho tháng hiện tại
  const isCurrentMonth = month === currentMonth();
  const daysElapsed = daily.length;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const spentSoFar = monthly?.total_expense || 0;
  const projectedTotal = isCurrentMonth && daysElapsed > 0
    ? Math.round((spentSoFar / daysElapsed) * daysInMonth)
    : null;
  const currentMonthBudgetEntry = budgetHistory.find((h) => h.month === month);
  const projectedBudgetTotal = currentMonthBudgetEntry?.budget_amount != null
    ? currentMonthBudgetEntry.budget_amount * daysInMonth
    : null;

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
                <BarChart data={dailyWithTotal} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {dailyCategories.map((cat, i) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={getCatColor(cat, i)} radius={i === dailyCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                  <Bar dataKey="__total__" stackId="a" fill="transparent" isAnimationActive={false} legendType="none">
                    <LabelList dataKey="__total__" position="top" formatter={(v) => v > 0 ? fmtShort(v) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Weekly trend — stacked by category */}
          <div className="card">
            <div className="section-header"><h2>Chi tiêu theo tuần</h2></div>
            {weekly.length === 0 ? (
              <div className="empty-state">Không có dữ liệu tháng này</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyWithTotal} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<WeeklyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {weeklyCategories.map((cat, i) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={getCatColor(cat, i)} radius={i === weeklyCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                  <Bar dataKey="__total__" stackId="a" fill="transparent" isAnimationActive={false} legendType="none">
                    <LabelList dataKey="__total__" position="top" formatter={(v) => v > 0 ? fmtShort(v) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Weekday pattern */}
          <div className="card">
            <div className="section-header"><h2>Chi tiêu theo thứ trong tuần</h2></div>
            {weekdayStats.reduce((sum, w) => sum + w.total, 0) === 0 ? (
              <div className="empty-state">Không có dữ liệu tháng này</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weekdayStats} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<WeekdayTooltip />} />
                  <Bar dataKey="avg_per_day" radius={[4, 4, 0, 0]}>
                    {weekdayStats.map((entry, i) => (
                      <Cell key={i} fill={i >= 5 ? "var(--accent)" : "#94a3b8"} />
                    ))}
                    <LabelList dataKey="avg_per_day" position="top" formatter={(v) => v > 0 ? fmtShort(v) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  </Bar>
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

          {/* Category trend over multiple months */}
          <div className="card">
            <div className="section-header">
              <h2>Xu hướng theo danh mục (6 tháng)</h2>
              <select
                className="filter-input"
                value={selectedCategoryId || ""}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {dailyCategoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            {!trendData || !trendHasData ? (
              <div className="empty-state">Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData.series} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="total" name="Chi tiêu" stroke={getCatColor(selectedCategory?.name, 0)} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="moving_avg" name="TB 3 tháng" stroke="var(--text-muted)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Comparison with previous month */}
          <div className="card">
            <div className="section-header"><h2>So sánh với tháng trước</h2></div>
            {comparisonData.length === 0 || comparisonData.every((c) => c.current === 0 && c.previous === 0) ? (
              <div className="empty-state">Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<ComparisonTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="current" name="Tháng này" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="previous" name="Tháng trước" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Budget history + burn-rate forecast */}
          <div className="card">
            <div className="section-header"><h2>Lịch sử tuân thủ budget</h2></div>

            {isCurrentMonth && projectedTotal !== null && (
              <div
                style={{
                  padding: "8px 12px", marginBottom: 12, borderRadius: 8,
                  background: "var(--bg-elevated)", fontSize: 13, color: "var(--text-secondary)",
                }}
              >
                Với tốc độ hiện tại, dự kiến cuối tháng chi khoảng{" "}
                <strong style={{
                  color: projectedBudgetTotal !== null
                    ? (projectedTotal > projectedBudgetTotal ? "var(--red)" : "var(--green)")
                    : "var(--text-primary)",
                }}>
                  {fmt(projectedTotal)}
                </strong>
                {projectedBudgetTotal !== null && <> (budget cả tháng: {fmt(projectedBudgetTotal)})</>}
              </div>
            )}

            {budgetHistory.length === 0 ? (
              <div className="empty-state">Không có dữ liệu</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "8px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Tháng</th>
                    <th style={{ textAlign: "right", padding: "8px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Budget/ngày</th>
                    <th style={{ textAlign: "right", padding: "8px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>TB chi/ngày thực tế</th>
                    <th style={{ textAlign: "right", padding: "8px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Số ngày vượt</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetHistory.map((h) => {
                    const overBudget = h.budget_amount != null && h.avg_daily_expense > h.budget_amount;
                    return (
                      <tr key={h.month} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 8px", color: "var(--text-primary)" }}>{h.month}</td>
                        <td style={{ padding: "8px 8px", textAlign: "right", color: h.budget_amount != null ? "var(--text-secondary)" : "var(--text-muted)" }}>
                          {h.budget_amount != null ? fmt(h.budget_amount) : "Chưa đặt"}
                        </td>
                        <td style={{ padding: "8px 8px", textAlign: "right", color: h.budget_amount != null ? (overBudget ? "var(--red)" : "var(--green)") : "var(--text-secondary)" }}>
                          {fmt(h.avg_daily_expense)}
                        </td>
                        <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                          {h.days_over_budget != null ? `${h.days_over_budget} / ${h.days_counted}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Anomalies */}
          <div className="card">
            <div className="section-header"><h2>Giao dịch bất thường</h2></div>
            {anomalies.length === 0 ? (
              <div className="empty-state">Không có giao dịch bất thường trong tháng này 🎉</div>
            ) : (
              <div className="txn-list">
                {anomalies.map((a) => (
                  <div key={a.id} className="txn-item">
                    <div className="txn-icon">{a.category_icon}</div>
                    <div className="txn-info">
                      <div className="txn-cat">{a.note || a.category_name}</div>
                      <div className="txn-time">{a.created_at.slice(8, 10)}/{a.created_at.slice(5, 7)}</div>
                    </div>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
                      background: "var(--red-dim)", color: "var(--red)",
                    }}>
                      {a.times_avg}x trung bình
                    </span>
                    <div className="txn-amount expense">{fmt(a.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
