# Task 6: Add Data Labels to Bar Charts in Reports & Yearly Report Pages

## Scope
Add data labels on top of bars (similar to the daily chart in `Overview.jsx`) for two pages:
1. `dashboard/src/pages/Reports.jsx` — daily spending chart (simple bar or stacked bar if Task 2 is done)
2. `dashboard/src/pages/YearlyReport.jsx` — monthly expense/income chart + monthly balance chart (if Task 5 is done)

## Reference implementation (already working in Overview.jsx)
```jsx
<LabelList
  dataKey="expense"
  position="top"
  formatter={(v) => v > 0 ? fmtShort(v) : ""}
  style={{ fill: "var(--text-muted)", fontSize: 10 }}
/>
```

## Changes per file

### `dashboard/src/pages/Reports.jsx`
- The daily chart is a **stacked bar chart** (Task 2 already implemented).
- Do NOT add `LabelList` to individual stacked segment bars — too cluttered.
- Only show the **total** label on top of the full stack using the Recharts invisible-bar trick:
  - Pre-compute `total` on each data entry (sum of all category values for that day).
  - Add a final transparent bar: `<Bar dataKey="total" stackId="a" fill="transparent" isAnimationActive={false}>` with a `LabelList` inside it.

### `dashboard/src/pages/YearlyReport.jsx`
- **Monthly expense/income chart** — the chart currently has two bars per month (`Tổng chi` and `Thu nhập`). Add `LabelList` to each:
  - `Tổng chi` bar: label above, formatter `fmtShort`, skip zeros
  - `Thu nhập` bar: same
- **Balance chart** (if Task 5 is done) — single bar per month:
  - Add `LabelList` with a formatter that prefixes `+` for positive values: `(v) => v !== 0 ? (v > 0 ? "+" : "") + fmtShort(v) : ""`

## Implementation notes
- Import `LabelList` from recharts if not already imported in each file.
- Always skip zero values in formatter to avoid noise: `(v) => v > 0 ? fmtShort(v) : ""`
- Increase chart `margin.top` by ~12px if labels get clipped (check current margin values).
- For the stacked-total label trick: add a final `<Bar dataKey="__total__" stackId="a" fill="transparent" isAnimationActive={false}>` where `__total__` is pre-computed in the data array. This bar is invisible but its LabelList renders above the full stack.

## Difficulty: Low (1–2 hours)
The stacked total label trick is the only non-trivial part; everything else is a straightforward `<LabelList>` insertion.

---

## Prompt for Claude Code

```
In the finance dashboard, add data labels on top of bar charts in two pages. The reference implementation is in `Overview.jsx` which uses `<LabelList>` inside `<Bar>`.

**File 1: `dashboard/src/pages/Reports.jsx`**

Read the file first. The daily chart is already a stacked bar chart (multiple `<Bar stackId="a">`).

- Do NOT add `LabelList` to any of the existing stacked segment bars.
- Pre-compute a `total` field on each data entry by summing all category values for that day.
- Add a single invisible bar at the end of the stack:
  ```jsx
  <Bar dataKey="total" stackId="a" fill="transparent" isAnimationActive={false}>
    <LabelList dataKey="total" position="top" formatter={(v) => v > 0 ? fmtShort(v) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
  </Bar>
  ```
- Increase the BarChart top margin to at least 20 so labels are not clipped.

**File 2: `dashboard/src/pages/YearlyReport.jsx`**

Read the file first.

1. For the monthly expense/income BarChart (has `<Bar dataKey="total" name="Tổng chi">` and `<Bar dataKey="income" name="Thu nhập">`):
   - Add `<LabelList dataKey="total" position="top" formatter={(v) => v > 0 ? fmtShort(v) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />` inside the Tổng chi bar.
   - Add the same for the income bar.
   - Increase the BarChart top margin to 20 if needed.

2. If the balance chart (Task 5) exists — `<Bar dataKey="balance" name="Số dư">`:
   - Add inside that bar:
     ```jsx
     <LabelList dataKey="balance" position="top" formatter={(v) => v !== 0 ? (v > 0 ? "+" : "") + fmtShort(Math.abs(v)) : ""} style={{ fill: "var(--text-muted)", fontSize: 10 }} />
     ```

Make sure `LabelList` is imported from recharts in each file. Do not change any other logic or layout.
```
