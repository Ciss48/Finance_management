# Task 1: Chi tiêu theo tuần trong tháng + so với tuần trước

## Scope
- Backend: thêm endpoint `GET /api/stats/weekly?month=YYYY-MM` trong `api/routes/stats.py`.
- Frontend: thêm 1 card chart mới "Chi tiêu theo tuần" vào `dashboard/src/pages/Reports.jsx`,
  đặt ngay dưới card "Chi tiêu theo ngày" hiện có.

## Backend spec

Thêm hàm mới trong `api/routes/stats.py` (cùng file với `daily_stats`, `monthly_stats`...):

```python
@router.get("/weekly")
def weekly_stats(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select("amount, type, created_at").gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    # Khởi tạo tuần cho mọi ngày trong tháng (tuần = Thứ 2 -> Chủ nhật, có thể bị cắt ở đầu/cuối tháng)
    weeks: dict[str, dict] = {}
    for day in _month_day_range(target_month):
        d = date.fromisoformat(day)
        week_start = d - timedelta(days=d.weekday())
        key = week_start.isoformat()
        if key not in weeks:
            week_end = week_start + timedelta(days=6)
            weeks[key] = {
                "week_start": key, "week_end": week_end.isoformat(),
                "label": f"{week_start.day:02d}/{week_start.month:02d} - {week_end.day:02d}/{week_end.month:02d}",
                "expense": 0, "income": 0,
            }

    for row in result.data:
        day = row["created_at"][:10]
        d = date.fromisoformat(day)
        week_start = (d - timedelta(days=d.weekday())).isoformat()
        if week_start not in weeks:
            continue
        if row["type"] == "expense":
            weeks[week_start]["expense"] += float(row["amount"])
        else:
            weeks[week_start]["income"] += float(row["amount"])

    weeks_list = sorted(weeks.values(), key=lambda x: x["week_start"])
    for i, w in enumerate(weeks_list):
        prev = weeks_list[i - 1] if i > 0 else None
        w["delta_pct"] = (
            round((w["expense"] - prev["expense"]) / prev["expense"] * 100, 1)
            if prev and prev["expense"] > 0 else None
        )
    return weeks_list
```

Response: list các tuần trong tháng, mỗi tuần có `week_start`, `week_end`, `label` (dạng
`"01/06 - 07/06"`), `expense`, `income`, `delta_pct` (% thay đổi `expense` so với tuần
ngay trước — `null` cho tuần đầu tháng hoặc khi tuần trước không có chi tiêu).

Nếu là tháng hiện tại, `_month_day_range` đã tự cắt tới hôm nay — tuần cuối cùng sẽ là
tuần chưa đầy đủ (bình thường, không cần xử lý thêm).

## Frontend spec

1. `dashboard/src/api.js` — thêm:
   ```js
   export const getWeeklyStats = (month) =>
     api.get("/api/stats/weekly", { params: month ? { month } : {} }).then((r) => r.data);
   ```
2. `dashboard/src/pages/Reports.jsx`:
   - Import `getWeeklyStats`, thêm state `const [weekly, setWeekly] = useState([]);`
   - Gọi cùng lúc với các API khác trong `Promise.all` của `useEffect` theo `month`.
   - Thêm 1 `<div className="card">` mới ngay sau card "Chi tiêu theo ngày", trước grid
     2 cột (top category + pie):
     - Header: `<h2>Chi tiêu theo tuần</h2>`
     - `BarChart` đơn giản (không stack): `dataKey="label"` cho XAxis, 1 `<Bar dataKey="expense">`
       màu `var(--accent)` hoặc dùng `getCatColor` cố định 1 màu, `LabelList` hiển thị `fmtShort`
       phía trên mỗi cột (theo đúng cách `Reports.jsx` đã làm ở chart khác).
     - Dưới mỗi cột (hoặc trong tooltip), hiển thị `delta_pct`: nếu dương hiện `"+X%"` màu đỏ
       (`var(--red)`), nếu âm hiện `"-X%"` màu xanh (`var(--green)`) — chi tiêu giảm là tốt,
       giữ đúng logic màu đã dùng cho "Số dư" trong file (xanh = tốt, đỏ = xấu). Cách đơn giản
       nhất: custom tooltip riêng cho chart này hiển thị `expense`, `income`, và dòng
       `delta_pct` kèm mô tả "so với tuần trước".
     - Empty state giống các chart khác: `weekly.length === 0` → `<div className="empty-state">Không có dữ liệu tháng này</div>`.

## Cách test
- `python run_api.py`, mở `http://localhost:8000/api/stats/weekly?month=2026-10` trên browser,
  kiểm tra JSON trả về hợp lý (tuần đầu/cuối tháng bị cắt đúng, `delta_pct` tính đúng).
- `cd dashboard && npm run dev`, vào trang Báo cáo chi tiết, đổi qua vài tháng (có dữ liệu,
  không dữ liệu, tháng hiện tại) kiểm tra chart hiển thị đúng, không lỗi console.
- `npm run lint` trong `dashboard/`.

---

## Prompt cho Claude Code

```
Đọc CLAUDE.md trước. Dự án finance tracker: FastAPI backend (api/), React dashboard
(dashboard/), Supabase Postgres.

Nhiệm vụ: thêm phân tích "chi tiêu theo tuần trong tháng" vào trang "Báo cáo chi tiết".

1. Backend — mở `api/routes/stats.py`, đọc toàn bộ file để hiểu pattern (đặc biệt các hàm
   `daily_stats` và helper `_month_day_range`). Thêm endpoint mới `GET /api/stats/weekly`
   nhận query param `month` (YYYY-MM, optional, default tháng hiện tại). Endpoint trả về
   list các tuần trong tháng đó (tuần = Thứ 2 -> Chủ nhật, cắt ở đầu/cuối tháng), mỗi tuần
   gồm: `week_start`, `week_end` (YYYY-MM-DD), `label` (dạng "01/06 - 07/06"), `expense`,
   `income` (tổng theo type), và `delta_pct` (% thay đổi expense so với tuần ngay trước,
   null nếu là tuần đầu hoặc tuần trước có expense = 0). Dùng lại `_month_day_range(month)`
   để khởi tạo đủ các tuần (kể cả tuần không có giao dịch), group transactions bằng
   `date.fromisoformat(created_at[:10]).weekday()` để tìm ngày đầu tuần (Thứ 2).

2. Frontend — mở `dashboard/src/api.js`, thêm hàm `getWeeklyStats(month)` gọi
   `/api/stats/weekly` theo đúng pattern các hàm `getXxxStats` đã có trong file.

3. Mở `dashboard/src/pages/Reports.jsx`, đọc toàn bộ file trước khi sửa. Thêm:
   - state `weekly`, gọi `getWeeklyStats(month)` cùng `Promise.all` với các API khác đang
     có trong `useEffect` theo `month`.
   - 1 card mới "Chi tiêu theo tuần" đặt giữa card "Chi tiêu theo ngày" và grid 2 cột
     (top category + pie). Dùng BarChart của recharts (đã import ở đầu file, có thể cần
     thêm icon/component nếu thiếu), 1 bar `expense` màu `var(--accent)`, LabelList hiển thị
     `fmtShort` phía trên cột theo đúng cách file đã làm ở chart khác (xem bar `__total__` ở
     chart "Chi tiêu theo ngày" làm mẫu). Custom tooltip riêng cho chart này hiển thị
     expense, income, và % thay đổi so với tuần trước (màu đỏ nếu tăng, xanh nếu giảm —
     giữ logic màu nhất quán với phần "Số dư" đã có trong file: chi tăng = xấu = đỏ).
   - Empty state khi `weekly.length === 0`, giống các chart khác trong file.
   - Không sửa logic/layout nào khác trong file.

4. Test: chạy `python run_api.py` (venv đã activate), mở
   `http://localhost:8000/api/stats/weekly?month=2026-10` kiểm tra JSON hợp lý. Chạy
   `cd dashboard && npm run dev`, vào trang Báo cáo chi tiết, đổi vài tháng kiểm tra chart
   hiển thị đúng, không lỗi console, rồi chạy `npm run lint` trong `dashboard/`.
```
