# Task 2: Stacked Vertical Bar Chart for Daily Spending in Reports Page

## Scope
Replace the simple daily bar chart in `dashboard/src/pages/Reports.jsx` with a **Stacked Vertical Bar Chart** where each bar is divided by spending category, so the user can see which category dominates each day.

## Current state
- `/api/stats/daily?month=YYYY-MM` returns: `[{ date, expense }]` — only a total per day
- The chart renders a single blue bar per day

## Required changes

### Backend — new endpoint
Add `GET /api/stats/daily-by-category?month=YYYY-MM` in `api/routes/stats.py`.

Response shape:
```json
[
  {
    "date": "2026-04-01",
    "label": "01",
    "categories": {
      "Ăn uống": 85000,
      "Cà phê": 35000,
      "Xăng xe": 0
    }
  }
]
```

SQL logic: `SELECT date, category_name, SUM(amount) FROM transactions WHERE month = ? GROUP BY date, category_name`.

### Frontend
1. `dashboard/src/api.js` — add `getDailyStatsByCategory(month)` calling the new endpoint
2. `dashboard/src/pages/Reports.jsx`:
   - Call `getDailyStatsByCategory` instead of (or in addition to) `getDailyStats`
   - Pivot the response so each category becomes a `<Bar>` stack: `<Bar dataKey="Ăn uống" stackId="a" fill={COLORS[0]} />`
   - Add a legend so the user can see which color = which category
   - Keep the tooltip showing all categories for that day

## Difficulty: Medium-High (3–5 hours)
The main complexity is in the backend pivot query and transforming the response into the format Recharts expects for stacked bars (each category must be a top-level key on the data object).

---

## Prompt for Claude Code

```
In the finance dashboard, replace the simple daily bar chart in `dashboard/src/pages/Reports.jsx` with a Stacked Vertical Bar Chart so each day's bar is broken down by spending category.

**Step 1 — Backend**: Add a new FastAPI route `GET /api/stats/daily-by-category` in `api/routes/stats.py`.
- Accept query param `month` (format `YYYY-MM`).
- Query the `transactions` table (via `api/database.py` Supabase client) to get `SUM(amount)` grouped by `date` AND category name for the given month. Only include `type = 'expense'` transactions (not income, not fixed costs — check how the existing `/api/stats/daily` endpoint filters).
- Return a list: `[{ "date": "YYYY-MM-DD", "label": "DD", ...{CategoryName: amount} }]` — each category name is a top-level key with its summed amount (0 if no spend that day).
- Register the new route in `api/main.py` if needed.

**Step 2 — Frontend**:
- In `dashboard/src/api.js`, add `export const getDailyCategoryStats = (month) => api.get("/api/stats/daily-by-category", { params: month ? { month } : {} }).then(r => r.data);`
- In `dashboard/src/pages/Reports.jsx`:
  - Import `getDailyCategoryStats` and `Legend` from recharts.
  - Replace `getDailyStats` with `getDailyCategoryStats` for the daily chart data.
  - Derive the list of unique category names from the response.
  - Render a `<BarChart>` with one `<Bar stackId="a" dataKey={categoryName} fill={COLORS[i]} />` per category.
  - Add a `<Legend />` component below the chart.
  - Update the tooltip to show each category and its value.

Read all files before editing. Do not remove the existing pie/bar category charts below the daily chart.
```
