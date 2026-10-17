# Task 5: Lịch sử tuân thủ budget + dự báo cuối tháng (burn-rate)

Task này có 2 phần tương đối độc lập: (A) lịch sử tuân thủ budget nhiều tháng (cần
backend mới), (B) dự báo cuối tháng cho tháng hiện tại (chỉ cần frontend, tính từ data
đã có sẵn trên trang).

## Phần A: Lịch sử tuân thủ budget (backend + frontend)

### Backend spec

Refactor nhỏ trước: trong `api/routes/stats.py`, hàm `daily_stats` đang query + aggregate
inline. Tách phần aggregate theo ngày (không gồm phần zero-fill) thành helper dùng lại
được, HOẶC đơn giản hơn — viết lại logic tương tự trực tiếp trong endpoint mới (ít rủi ro
hơn vì không đụng code đang chạy). Khuyến khích cách thứ 2 (không refactor `daily_stats`).

```python
@router.get("/budget-history")
def budget_history(months: int = Query(6, ge=2, le=24)):
    db = get_client()

    now = datetime.utcnow()
    month_keys = []
    y, m = now.year, now.month
    for _ in range(months):
        month_keys.append(f"{y}-{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    month_keys.reverse()

    # Budget đã set cho các tháng này
    budgets_result = db.table("monthly_budgets").select("month, amount").in_(
        "month", month_keys
    ).execute()
    budget_by_month = {r["month"]: float(r["amount"]) for r in budgets_result.data}

    history = []
    for mk in month_keys:
        budget_amount = budget_by_month.get(mk)
        day_range = _month_day_range(mk)
        txn_result = db.table("transactions").select("amount, created_at").eq(
            "type", "expense"
        ).gte("created_at", f"{mk}-01T00:00:00+00:00").lt(
            "created_at", _next_month(mk) + "-01T00:00:00+00:00"
        ).execute()

        daily_totals: dict[str, float] = {d: 0.0 for d in day_range}
        for row in txn_result.data:
            day = row["created_at"][:10]
            if day in daily_totals:
                daily_totals[day] += float(row["amount"])

        total_expense = sum(daily_totals.values())
        days_counted = len(day_range)
        avg_daily_expense = round(total_expense / days_counted, 0) if days_counted else 0
        days_over_budget = (
            sum(1 for v in daily_totals.values() if v > budget_amount)
            if budget_amount is not None else None
        )

        history.append({
            "month": mk,
            "budget_amount": budget_amount,
            "avg_daily_expense": avg_daily_expense,
            "days_counted": days_counted,
            "days_over_budget": days_over_budget,
        })

    return history
```

Response: list N tháng (cũ -> mới), mỗi tháng có `budget_amount` (null nếu chưa set),
`avg_daily_expense`, `days_counted` (số ngày đã tính, với tháng hiện tại chỉ tính đến hôm
nay — giống logic `_month_day_range`), `days_over_budget` (null nếu tháng đó chưa set
budget).

### Frontend spec

1. `dashboard/src/api.js` — thêm `getBudgetHistory(months = 6)`.
2. `dashboard/src/pages/Reports.jsx`:
   - State `budgetHistory`, fetch 1 lần (không phụ thuộc `month` của trang — đây là lịch
     sử độc lập).
   - Card mới "Lịch sử tuân thủ budget" — khuyến khích dùng **bảng** (table HTML đơn giản,
     không cần chart) vì budget mỗi tháng có thể khác nhau, khó so sánh trực quan bằng 1
     chart duy nhất:
     | Tháng | Budget/ngày | TB chi/ngày thực tế | Số ngày vượt |
     |---|---|---|---|
     | 2026-05 | 150.000đ | 142.000đ | 8 / 31 |
     | 2026-06 | Chưa đặt | 160.000đ | — |
   - Dòng nào `avg_daily_expense > budget_amount` thì tô số đó màu đỏ, ngược lại xanh.
   - Nếu `budget_amount` null, hiển thị "Chưa đặt" màu xám, cột "Số ngày vượt" hiển thị "—".

## Phần B: Dự báo cuối tháng (burn-rate) — chỉ frontend

Chỉ hiển thị khi `month === currentMonth()` (dự báo cho tháng tương lai không có nghĩa
với tháng đã qua, vì tháng đã qua đã có số liệu đầy đủ).

Tính toán trong `Reports.jsx`, dùng data `daily` (đã fetch sẵn cho chart "Chi tiêu theo
ngày") và `monthly`:

```js
import { currentMonth } from "../utils"; // đã có import sẵn

const isCurrentMonth = month === currentMonth();
const daysElapsed = daily.length; // daily đã bị cắt tới hôm nay nếu là tháng hiện tại
const daysInMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate();
const spentSoFar = (monthly?.total_expense || 0);
const projectedTotal = isCurrentMonth && daysElapsed > 0
  ? Math.round((spentSoFar / daysElapsed) * daysInMonth)
  : null;
```

Hiển thị 1 callout nhỏ (không cần chart) trong card "Lịch sử tuân thủ budget" hoặc card
riêng: "Với tốc độ hiện tại, dự kiến cuối tháng chi khoảng **{fmt(projectedTotal)}**"
— so sánh với `budget_amount * daysInMonth` của tháng hiện tại (lấy từ `getBudget(month)`
đã có sẵn trong `api.js`, hoặc từ phần tử cuối của `budgetHistory` nếu trùng tháng) để
tô màu đỏ/xanh.

## Cách test
- `http://localhost:8000/api/stats/budget-history?months=6` kiểm tra JSON, đặc biệt tháng
  chưa set budget phải có `budget_amount: null` và `days_over_budget: null`.
- Test UI: bảng hiển thị đúng, callout dự báo chỉ xuất hiện khi chọn đúng tháng hiện tại
  (2026-10), biến mất khi chọn tháng khác.
- `npm run lint` trong `dashboard/`.

---

## Prompt cho Claude Code

```
Đọc CLAUDE.md trước. Dự án finance tracker: FastAPI backend (api/), React dashboard
(dashboard/), Supabase Postgres. Có bảng `monthly_budgets` (1 budget/ngày cho mỗi tháng,
unique theo `month`), GET/PUT đã có ở `/api/budgets` (`api/routes/budgets.py` — xem nếu
cần tham khảo pattern, nhưng không sửa file đó).

Nhiệm vụ: thêm (A) lịch sử tuân thủ budget nhiều tháng, và (B) dự báo chi tiêu cuối tháng
hiện tại, vào trang "Báo cáo chi tiết".

PHẦN A — Backend: mở `api/routes/stats.py`, đọc toàn bộ file. Thêm endpoint mới
`GET /api/stats/budget-history` nhận query param `months` (int, default 6, min 2, max 24).
Logic:
- Tính list N tháng gần nhất (tháng hiện tại là tháng cuối), dạng "YYYY-MM", cũ -> mới.
- Query `monthly_budgets` để lấy `amount` cho các tháng trong list (dùng `.in_("month", month_keys)`).
- Với mỗi tháng: dùng `_month_day_range(mk)` để lấy danh sách ngày cần tính (tự cắt tới
  hôm nay nếu là tháng hiện tại), query transactions type="expense" trong tháng đó, group
  tổng theo ngày, tính `total_expense` và `avg_daily_expense = total_expense / days_counted`.
  Nếu tháng đó có `budget_amount` (không null), tính `days_over_budget` = số ngày có tổng
  chi > budget_amount; nếu không có budget thì `days_over_budget = None`.
- Trả về list: `{month, budget_amount, avg_daily_expense, days_counted, days_over_budget}`
  cho mỗi tháng trong list, cũ -> mới.

PHẦN A — Frontend:
- `dashboard/src/api.js`: thêm `getBudgetHistory(months = 6)` gọi `/api/stats/budget-history`
  với param `{months}`.
- `dashboard/src/pages/Reports.jsx` — đọc toàn bộ file trước khi sửa. Thêm state
  `budgetHistory`, fetch 1 lần qua `useEffect` riêng (KHÔNG phụ thuộc `month` của trang).
  Thêm 1 card mới "Lịch sử tuân thủ budget" (đặt gần cuối trang) chứa 1 bảng HTML đơn giản
  (không cần chart): cột Tháng / Budget mỗi ngày / TB chi mỗi ngày thực tế / Số ngày vượt.
  Dòng nào `avg_daily_expense > budget_amount` thì tô `avg_daily_expense` màu `var(--red)`,
  ngược lại `var(--green)`. Nếu `budget_amount` null, hiển thị "Chưa đặt" màu
  `var(--text-muted)` và cột "Số ngày vượt" hiển thị "—". Style bảng cho hợp với các
  `.card` khác trong file (padding, border giữa các dòng dùng `var(--border)`).

PHẦN B — chỉ frontend, trong cùng file `Reports.jsx`: thêm 1 đoạn tính "dự báo cuối tháng"
chỉ hiển thị khi `month === currentMonth()` (import `currentMonth` đã có sẵn trong file từ
`../utils`). Công thức: `daysElapsed = daily.length` (biến `daily` đã có sẵn trong component
từ trước), `daysInMonth` = số ngày thực của tháng đó
(`new Date(year, monthNum, 0).getDate()`), `spentSoFar = monthly?.total_expense || 0`,
`projectedTotal = Math.round((spentSoFar / daysElapsed) * daysInMonth)` (chỉ tính khi
`daysElapsed > 0`). Hiển thị callout nhỏ trong card "Lịch sử tuân thủ budget" (hoặc ngay
phía trên bảng): "Với tốc độ hiện tại, dự kiến cuối tháng chi khoảng {fmt(projectedTotal)}"
— so sánh `projectedTotal` với `budget_amount tháng hiện tại * daysInMonth` (lấy
`budget_amount` từ phần tử cuối của `budgetHistory` nếu `month` của nó khớp tháng hiện tại)
để tô chữ màu đỏ nếu vượt, xanh nếu không. Không hiển thị callout này khi xem tháng khác.

Không sửa logic/layout nào khác trong file, không sửa `api/routes/budgets.py`.

Test: `python run_api.py`, mở `http://localhost:8000/api/stats/budget-history?months=6`
kiểm tra JSON (đặc biệt tháng chưa set budget phải ra null đúng chỗ). `cd dashboard && npm
run dev`, kiểm tra bảng + callout dự báo (chỉ hiện ở tháng hiện tại), rồi `npm run lint`
trong `dashboard/`.
```
