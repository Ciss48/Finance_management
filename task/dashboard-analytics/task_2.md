# Task 2: Chi tiêu theo thứ trong tuần (pattern thói quen)

> Làm sau Task 1 (không phụ thuộc code của Task 1, nhưng nên làm theo thứ tự để
> `PLAN.md` phản ánh đúng tiến độ).

## Scope
- Backend: thêm endpoint `GET /api/stats/by-weekday?month=YYYY-MM` trong `api/routes/stats.py`.
- Frontend: thêm 1 card chart mới "Chi tiêu theo thứ trong tuần" vào `Reports.jsx`.

## Backend spec

```python
WEEKDAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]

@router.get("/by-weekday")
def stats_by_weekday(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select("amount, created_at").eq("type", "expense").gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    # Đếm số lần mỗi thứ xuất hiện trong tháng (để tính trung bình/ngày)
    occurrences = [0] * 7
    for day in _month_day_range(target_month):
        occurrences[date.fromisoformat(day).weekday()] += 1

    totals = [0.0] * 7
    for row in result.data:
        wd = date.fromisoformat(row["created_at"][:10]).weekday()
        totals[wd] += float(row["amount"])

    return [
        {
            "weekday": i,
            "label": WEEKDAY_LABELS[i],
            "total": totals[i],
            "count_days": occurrences[i],
            "avg_per_day": round(totals[i] / occurrences[i], 0) if occurrences[i] > 0 else 0,
        }
        for i in range(7)
    ]
```

Response: list 7 phần tử (Thứ 2 → Chủ nhật), mỗi phần tử có `total` (tổng chi cả tháng
vào thứ đó), `count_days` (số lần thứ đó xuất hiện trong tháng — vd tháng có thể có 4 hoặc
5 Chủ nhật), `avg_per_day` = `total / count_days` (chỉ số nên dùng để so sánh công bằng
giữa các thứ, vì số lần xuất hiện có thể khác nhau).

## Frontend spec

1. `dashboard/src/api.js` — thêm `getWeekdayStats(month)` theo pattern có sẵn.
2. `dashboard/src/pages/Reports.jsx`:
   - State `weekdayStats`, fetch cùng `Promise.all` theo `month`.
   - Card mới "Chi tiêu theo thứ trong tuần" — đặt trong grid 2 cột cùng với card "Top danh
     mục chi tiêu" / "Tỷ lệ danh mục" (có thể cần đổi grid 2 cột hiện tại thành 3 cột trên
     màn lớn, hoặc đặt full-width riêng 1 dòng — ưu tiên full-width riêng 1 dòng để chart
     không bị bóp nhỏ).
   - `BarChart` với `dataKey="label"` cho XAxis, 1 `<Bar dataKey="avg_per_day">` — dùng
     `avg_per_day` làm giá trị chính (không dùng `total`, vì số lần xuất hiện mỗi thứ
     không đều). Tooltip custom hiển thị cả `total` và `count_days` kèm `avg_per_day`.
   - Có thể highlight cột cuối tuần (Thứ 7, Chủ nhật) bằng màu khác (`var(--accent)`) so
     với ngày thường (màu xám/mặc định) để dễ thấy pattern "cuối tuần tốn hơn" — dùng `<Cell>`
     theo index giống cách `barData` trong file đã làm.
   - Empty state khi tổng tất cả `total` = 0.

## Cách test
- `http://localhost:8000/api/stats/by-weekday?month=2026-10` → kiểm tra 7 phần tử, tổng
  `total` của 7 thứ phải khớp với tổng `total_expense` của `/api/stats/monthly` cùng tháng
  (sai số do fixed-type category: endpoint này KHÔNG loại fixed-type, trong khi
  `by-category` có loại — nếu muốn khớp số, cân nhắc loại fixed-type category giống
  `daily_stats_by_category`; quyết định: giữ đơn giản, bao gồm cả fixed, vì mục tiêu là
  pattern thói quen chi tiêu theo ngày trong tuần nói chung, không phải riêng biến động).
- Test UI qua vài tháng, `npm run lint`.

---

## Prompt cho Claude Code

```
Đọc CLAUDE.md trước. Dự án finance tracker: FastAPI backend (api/), React dashboard
(dashboard/), Supabase Postgres.

Nhiệm vụ: thêm phân tích "chi tiêu theo thứ trong tuần" (Thứ 2 → Chủ nhật) vào trang
"Báo cáo chi tiết", để lộ ra pattern kiểu "cuối tuần tốn hơn ngày thường".

1. Backend — mở `api/routes/stats.py`, đọc toàn bộ file để hiểu pattern và helper
   `_month_day_range`. Thêm hằng số `WEEKDAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5",
   "Thứ 6", "Thứ 7", "Chủ nhật"]` và endpoint mới `GET /api/stats/by-weekday` nhận query
   param `month` (YYYY-MM, optional, default tháng hiện tại). Logic:
   - Lấy toàn bộ transactions type="expense" trong tháng.
   - Dùng `_month_day_range(month)` để đếm số lần mỗi thứ-trong-tuần xuất hiện trong
     tháng đó (biến `occurrences`, index 0=Thứ 2..6=Chủ nhật, dùng `date.fromisoformat(day).weekday()`).
   - Group tổng `amount` theo `weekday()` của `created_at[:10]`.
   - Trả về list 7 phần tử: `{weekday, label, total, count_days, avg_per_day}` với
     `avg_per_day = round(total / count_days, 0)` (0 nếu count_days = 0), theo đúng thứ
     tự Thứ 2 → Chủ nhật.

2. Frontend — `dashboard/src/api.js`: thêm `getWeekdayStats(month)` gọi
   `/api/stats/by-weekday` theo pattern các hàm `getXxxStats` đã có.

3. `dashboard/src/pages/Reports.jsx` — đọc toàn bộ file trước khi sửa. Thêm:
   - state `weekdayStats`, fetch cùng `Promise.all` theo `month` trong `useEffect` hiện có.
   - 1 card full-width mới "Chi tiêu theo thứ trong tuần", đặt sau card "Chi tiêu theo tuần"
     (nếu Task 1 đã làm) hoặc sau card "Chi tiêu theo ngày" (nếu chưa), trước grid 2 cột
     top-category/pie.
   - BarChart: XAxis `dataKey="label"`, 1 `<Bar dataKey="avg_per_day">`, dùng `<Cell>` theo
     index để tô màu Thứ 7 và Chủ nhật (index 5, 6) bằng `var(--accent)`, các ngày khác dùng
     màu bar mặc định đang dùng trong file. Custom tooltip hiển thị `total`, `count_days`,
     `avg_per_day` (dùng `fmtShort`/`fmt` có sẵn trong file).
   - Empty state khi tổng `total` của cả 7 phần tử = 0.
   - Không sửa logic/layout nào khác trong file.

4. Test: `python run_api.py`, mở `http://localhost:8000/api/stats/by-weekday?month=2026-10`
   kiểm tra JSON. `cd dashboard && npm run dev`, kiểm tra UI qua vài tháng, rồi
   `npm run lint` trong `dashboard/`.
```
