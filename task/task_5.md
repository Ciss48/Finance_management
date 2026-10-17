# Task 5: Monthly Balance Chart in Yearly Report Page

## Scope
Add a new **"Số dư theo tháng — {year}"** chart to `dashboard/src/pages/YearlyReport.jsx`, positioned below the existing monthly expense/income bar chart.

## Chart description
- A bar chart (or line chart) showing **net balance per month**: `income - expense - fixed`
- Bars colored green when positive, red when negative
- Same x-axis as the existing monthly chart (T1…T12)
- Tooltip shows: income, expense+fixed, balance for that month

## Data source
The existing `/api/stats/yearly` response already includes per-month data:
```json
{
  "monthly": [
    { "expense": 1200000, "fixed": 3800000, "income": 8000000 }
  ]
}
```
So **balance = income - expense - fixed** — no backend changes needed.

## Implementation notes
- Derive a new array `balanceChart` from `monthlyChart`:
  ```js
  const balanceChart = monthlyChart.map(m => ({
    label: m.label,
    balance: (m.income || 0) - (m.expense || 0) - (m.fixed || 0),
  }));
  ```
- Use `<Cell>` to color each bar: green if `balance >= 0`, red if negative
- Add this chart as a new `<div className="card">` block between the monthly expense chart and the `<div style="display:grid...">` category charts below
- Optionally add a `ReferenceLine y={0}` to mark the zero line clearly

## Difficulty: Low (1–2 hours)
Pure frontend work, data is already available from the existing API call.

---

## Prompt for Claude Code

```
In `dashboard/src/pages/YearlyReport.jsx`, add a new "Số dư theo tháng" bar chart below the existing monthly expense/income chart.

**Steps**:

1. After computing `monthlyChart`, add:
   ```js
   const balanceChart = monthlyChart.map(m => ({
     label: m.label,
     balance: (m.income || 0) - (m.expense || 0) - (m.fixed || 0),
   }));
   ```

2. Import `Cell` and `ReferenceLine` from recharts (check if already imported).

3. Add a new `<div className="card">` block immediately after the existing monthly chart card (before the `<div style={{ display: "grid"... }}>` row):
   ```jsx
   <div className="card">
     <div className="section-header"><h2>Số dư theo tháng — {year}</h2></div>
     <ResponsiveContainer width="100%" height={220}>
       <BarChart data={balanceChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
         <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
         <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
         <YAxis tickFormatter={fmtShort} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
         <Tooltip content={<CustomTooltip />} />
         <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
         <Bar dataKey="balance" name="Số dư" radius={[4, 4, 0, 0]}>
           {balanceChart.map((entry, i) => (
             <Cell key={i} fill={entry.balance >= 0 ? "var(--green)" : "var(--red)"} />
           ))}
         </Bar>
       </BarChart>
     </ResponsiveContainer>
   </div>
   ```

4. Update `CustomTooltip` in this file to format the `balance` key with a `+` prefix when positive.

Read `YearlyReport.jsx` fully before editing. Do not change any existing charts or data fetching.
```
