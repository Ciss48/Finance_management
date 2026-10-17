# Task 4: Budget Input with Threshold Line on Overview Daily Chart

## Scope
Add a **budget input field** at the top of the Overview page. The entered amount becomes a horizontal `ReferenceLine` on the daily spending bar chart, acting as a visual budget threshold.

## UI placement
- At the top of the Overview page, **between the topbar and the Hero KPI card**, add a compact budget section:
  ```
  [ 💰 Ngân sách tháng: [__________] đ ]  ← inline input row
  ```
- When the user types a value and presses Enter (or blurs), the threshold line appears on the chart.

## Persistence
- Store the budget value in `localStorage` with key `budget_YYYY-MM` (month-scoped) so it survives page refresh.
- On month change, load the budget for that month (default to empty/0).

## Chart change
- Import `ReferenceLine` from recharts (already a recharts project).
- When `budget > 0`, render:
  ```jsx
  <ReferenceLine y={budget} stroke="var(--yellow)" strokeDasharray="4 4" label={{ value: fmtShort(budget), fill: "var(--yellow)", fontSize: 11 }} />
  ```
  inside the daily `<BarChart>` in Overview.jsx.

## Implementation notes
- The daily chart uses the `CustomBar` shape renderer — ReferenceLine works independently of bar shape, no conflicts.
- Parse input as integer (strip non-numeric chars). Reject 0 or negative.
- The budget card/input should be visually lightweight — avoid adding a full stat-card; use a small inline row with a styled `<input type="number">`.

## Difficulty: Low-Medium (1–3 hours)

---

## Prompt for Claude Code

```
In `dashboard/src/pages/Overview.jsx`, add a monthly budget input with a threshold line on the daily spending chart.

**Step 1 — State & persistence**:
- Add state: `const [budget, setBudget] = useState(0)`.
- On mount and on `month` change: load from `localStorage.getItem("budget_" + month)` and set state.
- When user updates input: save to `localStorage.setItem("budget_" + month, value)`.

**Step 2 — UI**:
- Between the `<header className="topbar">` and the `<div className="hero-kpi-wrap">`, insert a compact budget row:
  ```jsx
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
  ```

**Step 3 — Chart threshold line**:
- In the daily `<BarChart>` (inside `<div className="card chart-card">`), import `ReferenceLine` from recharts.
- When `budget > 0`, add inside the BarChart:
  ```jsx
  <ReferenceLine y={budget} stroke="var(--yellow)" strokeDasharray="4 4" label={{ value: fmtShort(budget) + "đ", position: "right", fill: "var(--yellow)", fontSize: 11 }} />
  ```

Read `Overview.jsx` fully before editing. Do not change any other logic.
```
