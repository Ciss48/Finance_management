# Task 3: Chi tiêu theo giờ trong ngày (dayparts)

## Scope
- Backend: thêm endpoint `GET /api/stats/by-hour?month=YYYY-MM` trong `api/routes/stats.py`.
- Frontend: thêm 1 card chart mới "Chi tiêu theo giờ trong ngày" vào `Reports.jsx`.

## ⚠️ Lưu ý quan trọng: múi giờ
`transactions.created_at` lưu dạng **timestamptz theo UTC**. Việt Nam là UTC+7, không có
DST. Nếu lấy `.hour` trực tiếp từ UTC, pattern sẽ lệch 7 giờ (vd: ăn trưa 12h VN sẽ hiện
thành 05h). **Phải cộng thêm 7 giờ trước khi lấy hour**:

```python
from datetime import timezone
dt_utc = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
dt_vn = dt_utc + timedelta(hours=7)
hour = dt_vn.hour
```

## Backend spec

Chia 24 giờ thành 6 "dayparts" để biểu đồ gọn, dễ đọc (không vẽ 24 cột riêng lẻ):

```python
DAYPARTS = [
    ("Đêm khuya (0-6h)", 0, 6),
    ("Sáng (6-11h)", 6, 11),
    ("Trưa (11-14h)", 11, 14),
    ("Chiều (14-18h)", 14, 18),
    ("Tối (18-22h)", 18, 22),
    ("Khuya (22-24h)", 22, 24),
]

@router.get("/by-hour")
def stats_by_hour(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select("amount, created_at").eq("type", "expense").gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    totals = [0.0] * 6
    counts = [0] * 6
    for row in result.data:
        dt_utc = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        hour = (dt_utc + timedelta(hours=7)).hour
        for i, (_, start, end) in enumerate(DAYPARTS):
            if start <= hour < end:
                totals[i] += float(row["amount"])
                counts[i] += 1
                break

    return [
        {"label": DAYPARTS[i][0], "total": totals[i], "count": counts[i]}
        for i in range(6)
    ]
```

Response: list 6 phần tử theo thứ tự thời gian trong ngày, mỗi phần tử có `label`, `total`
(tổng chi expense trong khung giờ đó, cả tháng), `count` (số giao dịch).

## Frontend spec

1. `dashboard/src/api.js` — thêm `getHourlyStats(month)` theo pattern có sẵn.
2. `dashboard/src/pages/Reports.jsx`:
   - State `hourlyStats`, fetch cùng `Promise.all` theo `month`.
   - Card mới "Chi tiêu theo giờ trong ngày" — full-width hoặc nửa grid (tùy layout sau
     Task 1/2), đặt sau card "Chi tiêu theo thứ trong tuần".
   - BarChart hoặc có thể dùng `AreaChart` (nhập thêm từ recharts nếu muốn đường cong mềm)
     với XAxis `dataKey="label"`, 1 series `total`. Giữ đơn giản: dùng `BarChart` như các
     chart khác trong file để nhất quán, không cần thêm component mới nếu không cần thiết.
   - Tooltip custom hiển thị `total` và `count` (vd: "Buổi tối (18-22h): 2.400.000đ · 14 giao dịch").
   - Empty state khi tổng tất cả `total` = 0.

## Cách test
- `http://localhost:8000/api/stats/by-hour?month=2026-10` → kiểm tra tổng 6 khung giờ ≈
  tổng expense tháng đó (không cộng fixed costs từ `monthly_fixed_costs` vì đó không phải
  transactions; có thể lệch nhẹ do fixed-type transactions như "Đầu tư" vẫn được tính vào
  đây — chấp nhận được, mục tiêu là thói quen theo giờ, không phải số chính xác tuyệt đối).
- Đặc biệt kiểm tra: tạo (hoặc tìm sẵn) 1 giao dịch lúc ví dụ 23h VN, xác nhận nó rơi vào
  "Khuya (22-24h)" không bị lệch múi giờ thành khung giờ khác.
- Test UI qua vài tháng, `npm run lint`.

---

## Prompt cho Claude Code

```
Đọc CLAUDE.md trước. Dự án finance tracker: FastAPI backend (api/), React dashboard
(dashboard/), Supabase Postgres.

Nhiệm vụ: thêm phân tích "chi tiêu theo giờ trong ngày" vào trang "Báo cáo chi tiết",
chia theo 6 khung giờ (dayparts) để biểu đồ gọn, dễ đọc.

QUAN TRỌNG VỀ MÚI GIỜ: `transactions.created_at` lưu theo UTC. Việt Nam là UTC+7 (không
DST). Phải cộng thêm 7 giờ vào timestamp trước khi lấy `.hour`, nếu không toàn bộ pattern
sẽ lệch 7 giờ so với thực tế.

1. Backend — mở `api/routes/stats.py`, đọc toàn bộ file để hiểu pattern hiện có. Thêm
   hằng số:
   ```python
   DAYPARTS = [
       ("Đêm khuya (0-6h)", 0, 6),
       ("Sáng (6-11h)", 6, 11),
       ("Trưa (11-14h)", 11, 14),
       ("Chiều (14-18h)", 14, 18),
       ("Tối (18-22h)", 18, 22),
       ("Khuya (22-24h)", 22, 24),
   ]
   ```
   và endpoint mới `GET /api/stats/by-hour` nhận query param `month` (YYYY-MM, optional,
   default tháng hiện tại). Lấy toàn bộ transactions type="expense" trong tháng, với mỗi
   row: parse `created_at` thành datetime UTC (`datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))`),
   cộng `timedelta(hours=7)` để ra giờ Việt Nam, lấy `.hour`, xác định rơi vào daypart nào
   (`start <= hour < end`), cộng `amount` vào `totals[i]` và tăng `counts[i]`. Trả về list
   6 phần tử theo thứ tự: `{label, total, count}`.

2. Frontend — `dashboard/src/api.js`: thêm `getHourlyStats(month)` gọi `/api/stats/by-hour`
   theo pattern các hàm `getXxxStats` đã có.

3. `dashboard/src/pages/Reports.jsx` — đọc toàn bộ file trước khi sửa. Thêm:
   - state `hourlyStats`, fetch cùng `Promise.all` theo `month` trong `useEffect` hiện có.
   - 1 card mới "Chi tiêu theo giờ trong ngày", đặt sau các card chart đã có (theo ngày/tuần/thứ
     nếu đã làm). Dùng `BarChart` của recharts (giữ nhất quán với style chart khác trong
     file), XAxis `dataKey="label"`, 1 `<Bar dataKey="total">`. Custom tooltip hiển thị
     `total` (dùng `fmt`/`fmtShort` có sẵn) và `count` (vd "14 giao dịch").
   - Empty state khi tổng tất cả `total` của 6 phần tử = 0.
   - Không sửa logic/layout nào khác trong file.

4. Test: `python run_api.py`, mở `http://localhost:8000/api/stats/by-hour?month=2026-10`
   kiểm tra JSON và đặc biệt xác nhận không bị lệch múi giờ (lấy 1 giao dịch biết rõ giờ
   thực tế để đối chiếu). `cd dashboard && npm run dev`, kiểm tra UI, rồi `npm run lint`
   trong `dashboard/`.
```
