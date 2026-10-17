# Task 3: Category Filter Toggle for Charts

## Scope
Add a multi-select category filter UI to **three pages** so the user can hide/show specific categories on charts:
- `dashboard/src/pages/Reports.jsx` (Báo cáo chi tiết) — stacked daily bar chart (built in Task 2) + pie + category bar
- `dashboard/src/pages/Overview.jsx` — pie chart "Theo danh mục"
- `dashboard/src/pages/YearlyReport.jsx` — category pie and bar charts

**Use case**: Some categories spike on rare days (e.g. a travel expense inflates the chart scale), making other categories hard to read. The filter lets the user exclude those from the view without deleting data.

## UI design
- A row of toggle chips/buttons, one per category (show icon + name)
- All selected by default
- Clicking a chip toggles it off (grayed out); clicking again re-enables
- Filter state is local (per page), not persisted — resetting on page navigation is fine

## Implementation notes
- This is **frontend-only** — no backend changes needed
- The category list comes from `catStats.categories` (already fetched)
- Filter applies by excluding deselected categories from chart data arrays before passing to Recharts
- For the stacked bar chart in Reports.jsx (Task 2), excluding a category means removing its `<Bar>` element entirely
- For pie chart, filter `pieData` before render
- For category bar chart, filter `barData` before render
- Keep the filter chips compact and scrollable if there are many categories

## Difficulty: Medium (2–4 hours)
Low complexity per page, but must be implemented cleanly in 3 different pages.

---

## Prompt for Claude Code

```
In the finance dashboard, add a category filter UI to three pages: `Reports.jsx`, `Overview.jsx`, and `YearlyReport.jsx`. This is a frontend-only change.

**Feature**: A row of toggle chip buttons appears above the chart section. Each chip = one spending category (show its icon + name). All chips are ON by default. Clicking a chip toggles it off (dimmed/greyed); clicking again re-enables. Only selected categories appear in the charts.

**Implementation for each page**:

1. `dashboard/src/pages/Reports.jsx`:
   - Add `const [activeCategories, setActiveCategories] = useState(new Set())` — populate with all category names once catStats loads.
   - Render toggle chips in a flex-wrap row above the chart section.
   - Filter `pieData` and `barData` to only include categories in `activeCategories`.
   - For the stacked bar chart (Task 2): only render `<Bar>` elements for active categories.

2. `dashboard/src/pages/Overview.jsx`:
   - Same toggle chip approach, same useState pattern.
   - Filter `pieData` used in the "Theo danh mục" pie chart.

3. `dashboard/src/pages/YearlyReport.jsx`:
   - Same toggle chip approach.
   - Filter `pieData` and `barData` for the yearly category charts.

**Chip styling**: Use inline styles consistent with the existing dark theme (background `var(--card)`, border `var(--border)`, active: border `var(--accent)`, inactive: opacity 0.4). Keep chips compact (padding 4px 10px, font-size 12px, border-radius 999px).

Read all target files before editing. Do not change any data fetching logic.
```
