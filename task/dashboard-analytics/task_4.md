# Task 4: Xu hướng 1 category qua nhiều tháng + trung bình động

## Scope
- Backend: thêm endpoint `GET /api/stats/category-trend?category_id=<id>&months=6` trong
  `api/routes/stats.py`.
- Frontend: thêm 1 card mới "Xu hướng theo danh mục" vào `Reports.jsx`, có dropdown chọn
  category.

## Backend spec

```python
@router.get("/category-trend")
def category_trend(category_id: str, months: int = Query(6, ge=2, le=24)):
    db = get_client()

    now = datetime.utcnow()
    # Danh sách N tháng gần nhất, từ cũ -> mới (tháng hiện tại là tháng cuối)
    month_keys = []
    y, m = now.year, now.month
    for _ in range(months):
        month_keys.append(f"{y}-{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    month_keys.reverse()

    start = f"{month_keys[0]}-01T00:00:00+00:00"
    end = _next_month(month_keys[-1]) + "-01T00:00:00+00:00"

    result = db.table("transactions").select("amount, created_at").eq(
        "category_id", category_id
    ).eq("type", "expense").gte("created_at", start).lt("created_at", end).execute()

    totals = {mk: 0.0 for mk in month_keys}
    for row in result.data:
        mk = row["created_at"][:7]
        if mk in totals:
            totals[mk] += float(row["amount"])

    series = [{"month": mk, "total": totals[mk]} for mk in month_keys]

    # Trung bình động 3 tháng (dùng các điểm có sẵn trong window, không cần đủ 3 điểm)
    for i, point in enumerate(series):
        window = series[max(0, i - 2):i + 1]
        point["moving_avg"] = round(sum(p["total"] for p in window) / len(window), 0)

    return {"category_id": category_id, "months": months, "series": series}
```

Response: `{category_id, months, series: [{month, total, moving_avg}, ...]}`, sắp xếp từ
tháng cũ nhất đến tháng hiện tại.

`category_id` là **required** query param (không có category mặc định — frontend phải
cho người dùng chọn trước).

## Frontend spec

1. `dashboard/src/api.js` — thêm:
   ```js
   export const getCategoryTrend = (categoryId, months = 6) =>
     api.get("/api/stats/category-trend", { params: { category_id: categoryId, months } }).then((r) => r.data);
   ```
2. `dashboard/src/pages/Reports.jsx`:
   - Cần danh sách category để làm dropdown chọn — dùng `getCategories()` đã có sẵn trong
     `api.js` (import thêm nếu chưa có trong file này), filter `type === "daily"` (loại
     category cố định, vì xu hướng chi phí cố định không có ý nghĩa — nó gần như hằng số
     mỗi tháng).
   - State mới: `categories` (fetch 1 lần khi mount, không phụ thuộc `month`),
     `selectedCategoryId` (mặc định = category đầu tiên sau khi categories load xong),
     `trendData` (fetch lại khi `selectedCategoryId` đổi — **độc lập với `month` đang chọn
     ở trên cùng trang**, vì đây là xu hướng nhiều tháng, không phải 1 tháng).
   - Card mới "Xu hướng theo danh mục (6 tháng)":
     - Header có dropdown `<select>` để chọn category (icon + tên), style theo class
       `filter-input` đã dùng cho dropdown tháng ở đầu trang.
     - `LineChart` (cần import `LineChart, Line` từ recharts — thêm vào import ở đầu file
       nếu chưa có) với XAxis `dataKey="month"`, 2 đường: `total` (nét liền, màu theo
       category hiện tại dùng `getCatColor`) và `moving_avg` (nét đứt `strokeDasharray="5 5"`,
       màu xám `var(--text-muted)`).
     - Tooltip custom hiển thị cả 2 giá trị.
     - Empty state nếu `trendData.series` toàn 0 hoặc rỗng.

## Cách test
- `http://localhost:8000/api/stats/category-trend?category_id=<id>&months=6` với 1 id
  category daily có sẵn — kiểm tra 6 tháng trả về, tháng cuối = tháng hiện tại.
- Test UI: đổi category trong dropdown, xem line chart đổi theo, không bị lỗi khi category
  không có giao dịch tháng nào (toàn 0).
- `npm run lint` trong `dashboard/`.

---

## Prompt cho Claude Code

```
Đọc CLAUDE.md trước. Dự án finance tracker: FastAPI backend (api/), React dashboard
(dashboard/), Supabase Postgres.

Nhiệm vụ: thêm chart "xu hướng chi tiêu theo 1 category cụ thể qua nhiều tháng" (kèm
trung bình động 3 tháng) vào trang "Báo cáo chi tiết".

1. Backend — mở `api/routes/stats.py`, đọc toàn bộ file để hiểu pattern và helper
   `_next_month` (import từ `api.routes.transactions`, đã có sẵn ở đầu file). Thêm endpoint
   mới `GET /api/stats/category-trend` nhận query param `category_id` (str, required) và
   `months` (int, default 6, min 2, max 24). Logic:
   - Tính list N tháng gần nhất (bao gồm tháng hiện tại là tháng cuối), dạng "YYYY-MM",
     sắp xếp từ cũ -> mới.
   - Query transactions có `category_id` đúng, `type="expense"`, `created_at` trong
     khoảng từ đầu tháng đầu tiên đến hết tháng cuối cùng.
   - Group tổng `amount` theo tháng (`created_at[:7]`), khởi tạo sẵn 0 cho mọi tháng trong
     list (không bỏ tháng nào dù không có giao dịch).
   - Tính `moving_avg` cho mỗi điểm = trung bình của chính nó và tối đa 2 điểm trước đó
     trong series (window `series[max(0, i-2):i+1]`), không cần đợi đủ 3 điểm.
   - Trả về `{category_id, months, series: [{month, total, moving_avg}, ...]}`.

2. Frontend — `dashboard/src/api.js`: thêm `getCategoryTrend(categoryId, months = 6)` gọi
   `/api/stats/category-trend` với params `{category_id: categoryId, months}`.

3. `dashboard/src/pages/Reports.jsx` — đọc toàn bộ file trước khi sửa. Thêm:
   - Import `getCategories` từ `../api` (xem cách nó được dùng ở `Categories.jsx` hoặc
     `Overview.jsx` nếu cần tham khảo pattern), import thêm `LineChart, Line` từ `recharts`
     nếu chưa có trong import hiện tại.
   - State `categories` (fetch 1 lần qua `useEffect` riêng, không phụ thuộc `month`),
     `selectedCategoryId` (set mặc định = category daily đầu tiên sau khi `categories`
     load xong), `trendData` (fetch qua `getCategoryTrend(selectedCategoryId)` trong
     `useEffect` riêng phụ thuộc `selectedCategoryId`, KHÔNG phụ thuộc `month` của trang).
   - Lọc `categories` chỉ lấy `type === "daily"` khi build dropdown (bỏ category cố định
     như Tiền nhà, Tiền gym...).
   - 1 card mới "Xu hướng theo danh mục (6 tháng)" đặt cuối trang (sau các chart khác):
     header có `<select>` chọn category (dùng class `filter-input` cho đồng bộ style với
     dropdown tháng ở đầu trang), hiển thị icon + tên category trong option. Bên dưới là
     `LineChart`: XAxis `dataKey="month"`, `<Line dataKey="total">` nét liền màu theo
     `getCatColor(tên category, index)`, `<Line dataKey="moving_avg">` nét đứt
     (`strokeDasharray="5 5"`) màu `var(--text-muted)`, không có dot nếu muốn gọn
     (`dot={false}`). Tooltip custom (có thể viết component tooltip riêng trong file) hiển
     thị cả `total` và `moving_avg` dùng `fmt`/`fmtShort` có sẵn.
   - Empty state khi `trendData?.series` rỗng hoặc tất cả `total` = 0.
   - Không sửa logic/layout nào khác trong file.

4. Test: `python run_api.py`, mở `http://localhost:8000/api/stats/category-trend?category_id=<id-có-thật>&months=6`
   (lấy 1 id category daily có thật từ bảng categories hoặc từ `GET /api/categories`)
   kiểm tra JSON. `cd dashboard && npm run dev`, đổi category trong dropdown kiểm tra chart
   đổi theo, rồi `npm run lint` trong `dashboard/`.
```
