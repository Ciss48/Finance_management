# Task 6: So sánh tháng này vs tháng trước theo category

> Task này **không cần sửa backend** — chỉ dùng lại endpoint `/api/stats/by-category` đã
> có sẵn, gọi 2 lần (tháng hiện tại + tháng trước) và merge ở frontend.

## Scope
- Frontend only: `dashboard/src/utils.js` (thêm 1 helper nhỏ) + `dashboard/src/pages/Reports.jsx`.

## Spec

### 1. `dashboard/src/utils.js` — thêm helper tính tháng trước

```js
export function prevMonthStr(month) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m là 1-indexed; Date() nhận month 0-indexed nên m-1, lùi thêm 1 tháng = m-2
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
```
Kiểm tra: `prevMonthStr("2026-01")` phải ra `"2025-12"` (qua năm đúng).

### 2. `dashboard/src/pages/Reports.jsx`

- Import `prevMonthStr` từ `../utils`, import `getCategoryStats` đã có sẵn trong file
  (dùng lại, không cần hàm API mới).
- State mới: `prevCatStats` — fetch bằng `getCategoryStats(prevMonthStr(month))` cùng lúc
  với `catStats` hiện tại trong `Promise.all` của `useEffect` theo `month`.
- Merge data: với mỗi category trong `catStats.categories` (tháng hiện tại), tìm category
  cùng tên trong `prevCatStats.categories` (tháng trước) để lấy `total` tương ứng (0 nếu
  không có). Lấy top 7 theo tháng hiện tại (giữ nhất quán với `barData` đang lấy top 7).

```js
const comparisonData = (catStats?.categories || [])
  .slice(0, 7)
  .map((c) => {
    const prev = (prevCatStats?.categories || []).find((p) => p.name === c.name);
    return { name: c.name, current: c.total, previous: prev?.total || 0, icon: c.icon };
  });
```

- Card mới "So sánh với tháng trước" — đặt gần cuối trang (sau card so sánh/lịch sử nếu
  Task 5 đã làm, trước card xu hướng category nếu Task 4 đã làm — thứ tự không quan trọng
  nhiều, ưu tiên không che layout hiện có).
  - `BarChart` grouped (2 bar cạnh nhau cho mỗi category, **không** `stackId`): XAxis
    `dataKey="name"`, `<Bar dataKey="current" name="Tháng này">` màu `var(--accent)`,
    `<Bar dataKey="previous" name="Tháng trước">` màu `var(--text-muted)` hoặc xám nhạt.
  - `<Legend>` hiển thị "Tháng này" / "Tháng trước" (dùng `<Legend>` đã import sẵn trong
    file).
  - Tooltip custom hiển thị cả 2 giá trị + % thay đổi: `((current - previous) / previous * 100)`
    nếu `previous > 0`, màu đỏ nếu tăng, xanh nếu giảm.
  - Empty state nếu `comparisonData` rỗng hoặc tất cả `current` và `previous` đều 0.

## Cách test
- Chọn tháng 2026-10, xác nhận card gọi đúng `getCategoryStats("2026-09")` cho dữ liệu
  tháng trước (kiểm tra qua Network tab của browser devtools).
- Chọn tháng 2026-01 để kiểm tra `prevMonthStr` xử lý đúng qua năm (`2025-12`).
- `npm run lint` trong `dashboard/`.

---

## Prompt cho Claude Code

```
Đọc CLAUDE.md trước. Dự án finance tracker: FastAPI backend (api/), React dashboard
(dashboard/), Supabase Postgres.

Nhiệm vụ: thêm chart "so sánh chi tiêu theo category giữa tháng này và tháng trước" vào
trang "Báo cáo chi tiết". KHÔNG cần sửa backend — chỉ gọi lại endpoint
`/api/stats/by-category` đã có (hàm `getCategoryStats(month)` trong `dashboard/src/api.js`,
đã dùng sẵn trong `Reports.jsx`), gọi thêm 1 lần cho tháng trước.

1. `dashboard/src/utils.js` — đọc file để biết các export hiện có (`fmt`, `fmtShort`,
   `COLORS`, `getCatColor`, `currentMonth`...), rồi thêm hàm export mới:
   ```js
   export function prevMonthStr(month) {
     const [y, m] = month.split("-").map(Number);
     const d = new Date(y, m - 2, 1);
     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
   }
   ```
   (m-2 vì Date() nhận tháng 0-indexed và cần lùi thêm 1 tháng). Xử lý đúng khi qua năm,
   ví dụ `prevMonthStr("2026-01")` phải ra `"2025-12"`.

2. `dashboard/src/pages/Reports.jsx` — đọc toàn bộ file trước khi sửa. Thêm:
   - Import `prevMonthStr` từ `../utils`.
   - State `prevCatStats`, fetch bằng `getCategoryStats(prevMonthStr(month))` — thêm vào
     `Promise.all` đang có trong `useEffect` theo `month` (cùng nơi đang gọi
     `getMonthlyStats`, `getDailyCategoryStats`, `getCategoryStats`).
   - Tính `comparisonData`: lấy top 7 category của `catStats.categories` (tháng hiện tại,
     giữ đúng cách `barData` đang lấy top 7 trong file), với mỗi category tìm category
     cùng `name` trong `prevCatStats.categories` để lấy `total` làm `previous` (0 nếu
     không tìm thấy), map thành `{name, icon, current: c.total, previous}`.
   - 1 card mới "So sánh với tháng trước": `BarChart` KHÔNG dùng `stackId` (2 bar cạnh
     nhau mỗi category) — `<Bar dataKey="current" name="Tháng này">` màu `var(--accent)`,
     `<Bar dataKey="previous" name="Tháng trước">` màu xám nhạt (ví dụ
     `var(--text-muted)` hoặc màu tương tự khác đã dùng trong file cho dữ liệu phụ). Thêm
     `<Legend>` (đã import sẵn trong file từ recharts). Viết custom tooltip hiển thị cả 2
     giá trị và % thay đổi (`(current - previous) / previous * 100`, bỏ qua/hiện "—" nếu
     `previous === 0`), màu đỏ nếu chi tăng, xanh nếu giảm — giữ logic màu nhất quán với
     phần "Số dư" đã có trong file.
   - Empty state khi `comparisonData` rỗng hoặc toàn 0.
   - Không sửa logic/layout nào khác trong file.

3. Test: `cd dashboard && npm run dev`, vào trang Báo cáo chi tiết, mở devtools Network
   tab xác nhận có gọi `/api/stats/by-category` cho đúng cả tháng hiện tại và tháng
   trước. Thử chọn tháng 01 để kiểm tra `prevMonthStr` xử lý đúng khi qua năm. Chạy
   `npm run lint` trong `dashboard/`.
```
