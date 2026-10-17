# Task 1: Fix Color Collision & Rename Reports Page

## Scope
- Fix "Du lịch" and "Giải trí/Bạn bè" sharing the same color — change "Du lịch" to white (`#ffffff` or `#f0f0f0`)
- Rename the Reports page title from "Báo cáo" → "Báo cáo chi tiết" (page heading + nav sidebar link)

## Files to modify
1. `dashboard/src/utils.js` — extend or restructure the COLORS array so "Du lịch" gets white
2. `dashboard/src/pages/Reports.jsx` — change `<h1>` title and subtitle
3. `dashboard/src/Layout.jsx` — update the nav link label for the Reports route

## Implementation notes
- The current `COLORS` array has 8 entries assigned by index. Because there are 9 categories, index 8 wraps to COLORS[0], causing a collision.
- Simplest fix: add a 9th color (white/light) to COLORS so it becomes `[..., "#e2e8f0"]` — but this is fragile if category order changes.
- Better fix: check which two categories get the same color and assign a named override. Since colors are assigned by position in API response, verify the order from the backend.
- For white on dark backgrounds, use `#e2e8f0` (light gray-white) rather than pure `#ffffff` to remain visible.

## Difficulty: Low (1–2 hours)

---

## Prompt for Claude Code

```
In the finance dashboard (React + Recharts), fix two small issues:

1. **Color collision**: "Du lịch" and "Giải trí/Bạn bè" categories are showing the same color on charts.
   - Open `dashboard/src/utils.js` and read the current COLORS array.
   - Add a 9th distinct color (e.g. `"#e2e8f0"`) so that the 9th category gets a unique color instead of wrapping back to index 0.
   - Verify the fix by checking how COLORS is used across `Reports.jsx`, `Overview.jsx`, `YearlyReport.jsx`.

2. **Rename Reports page**:
   - In `dashboard/src/pages/Reports.jsx`, change the `<h1>` page title from "Báo cáo" to "Báo cáo chi tiết".
   - In `dashboard/src/Layout.jsx`, find the nav link for the `/reports` route and update its label to "Báo cáo chi tiết".

Do not change any other logic or layout. Read each file before editing.
```
