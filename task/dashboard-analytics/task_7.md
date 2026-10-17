# Task 7: Phát hiện giao dịch bất thường (anomaly)

> Task phức tạp nhất về logic — nên làm cuối cùng sau khi đã quen pattern từ các task
> trước.

## Scope
- Backend: thêm endpoint `GET /api/stats/anomalies?month=YYYY-MM` trong `api/routes/stats.py`.
- Frontend: thêm 1 card danh sách (không phải chart) "Giao dịch bất thường" vào `Reports.jsx`.

## Logic phát hiện bất thường

Với mỗi category (type="daily") có **ít nhất 3 giao dịch** trong tháng, tính `mean` và
`stddev` của `amount` các giao dịch trong category đó. Một giao dịch được coi là "bất
thường" nếu:

```
amount > max(mean + 2 * stddev, mean * 2)
```

(kết hợp 2 điều kiện: lệch chuẩn thống kê VÀ phải lớn hơn gấp đôi trung bình — tránh báo
động giả ở category có chi tiêu rất đều, nơi stddev nhỏ khiến ngưỡng quá thấp).

Category có < 3 giao dịch trong tháng: bỏ qua (không đủ dữ liệu để tính mean/stddev có
ý nghĩa).

## Backend spec

```python
import statistics

@router.get("/anomalies")
def stats_anomalies(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select(
        "id, amount, note, created_at, categories(id, name, icon, type)"
    ).eq("type", "expense").gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    by_category: dict[str, list[dict]] = {}
    for row in result.data:
        cat = row.get("categories")
        if not cat or cat.get("type") != "daily":
            continue
        by_category.setdefault(cat["name"], []).append(row)

    anomalies = []
    for cat_name, rows in by_category.items():
        if len(rows) < 3:
            continue
        amounts = [float(r["amount"]) for r in rows]
        mean = statistics.mean(amounts)
        stddev = statistics.stdev(amounts)
        threshold = max(mean + 2 * stddev, mean * 2)
        for r, amt in zip(rows, amounts):
            if amt > threshold:
                cat = r["categories"]
                anomalies.append({
                    "id": r["id"],
                    "amount": amt,
                    "note": r.get("note"),
                    "created_at": r["created_at"],
                    "category_name": cat["name"],
                    "category_icon": cat.get("icon", "📦"),
                    "category_avg": round(mean, 0),
                    "times_avg": round(amt / mean, 1) if mean > 0 else None,
                })

    anomalies.sort(key=lambda a: a["amount"], reverse=True)
    return anomalies[:10]
```

Response: list tối đa 10 giao dịch bất thường, mỗi item có `id`, `amount`, `note`,
`created_at`, `category_name`, `category_icon`, `category_avg` (trung bình category đó
trong tháng), `times_avg` (giao dịch này gấp bao nhiêu lần trung bình).

## Frontend spec

1. `dashboard/src/api.js` — thêm `getAnomalies(month)` theo pattern có sẵn.
2. `dashboard/src/pages/Reports.jsx`:
   - State `anomalies`, fetch cùng `Promise.all` theo `month`.
   - Card mới "Giao dịch bất thường" — **không phải chart**, là 1 list đơn giản (giống
     cách "Giao dịch gần đây" hiển thị trong `Overview.jsx` — tham khảo style ở đó nếu
     cần nhất quán: icon, note, ngày, số tiền).
   - Mỗi item: icon category, note (hoặc tên category nếu note trống), ngày
     (`created_at` format dd/mm), số tiền (`fmt`), badge nhỏ màu đỏ/cam hiển thị
     `"{times_avg}x trung bình"`.
   - Empty state khi `anomalies.length === 0`: `<div className="empty-state">Không có giao dịch bất thường trong tháng này 🎉</div>`.

## Cách test
- `http://localhost:8000/api/stats/anomalies?month=2026-10` kiểm tra JSON — nếu tháng đó
  chi tiêu đều, kết quả có thể rỗng (hợp lý, không phải lỗi).
- Test thử bằng cách tạm tạo 1 giao dịch rất lớn (ví dụ gấp 5 lần chi tiêu "Ăn uống" bình
  thường) qua Telegram bot hoặc API, xác nhận nó xuất hiện trong danh sách — sau đó xoá
  giao dịch test đó.
- `npm run lint` trong `dashboard/`.

---

## Prompt cho Claude Code

```
Đọc CLAUDE.md trước. Dự án finance tracker: FastAPI backend (api/), React dashboard
(dashboard/), Supabase Postgres.

Nhiệm vụ: thêm phát hiện "giao dịch bất thường" (chi tiêu lớn hơn nhiều so với trung bình
category đó trong tháng) vào trang "Báo cáo chi tiết".

1. Backend — mở `api/routes/stats.py`, đọc toàn bộ file để hiểu pattern hiện có. Thêm
   `import statistics` ở đầu file, và endpoint mới `GET /api/stats/anomalies` nhận query
   param `month` (YYYY-MM, optional, default tháng hiện tại). Logic:
   - Lấy toàn bộ transactions type="expense" trong tháng, kèm `categories(id, name, icon, type)`.
   - Group theo category name, CHỈ xét category có `type == "daily"` (bỏ qua category cố
     định).
   - Với mỗi category có >= 3 giao dịch trong tháng: tính `mean` và `stddev` (dùng module
     `statistics`) của các `amount`. Ngưỡng bất thường = `max(mean + 2*stddev, mean*2)`.
     Giao dịch nào có `amount` > ngưỡng này được coi là bất thường.
   - Category có < 3 giao dịch: bỏ qua, không tính.
   - Mỗi giao dịch bất thường trả về: `{id, amount, note, created_at, category_name,
     category_icon, category_avg (mean đã round), times_avg (amount/mean đã round 1 số lẻ)}`.
   - Sort toàn bộ kết quả theo `amount` giảm dần, giới hạn tối đa 10 item, trả về list.

2. Frontend — `dashboard/src/api.js`: thêm `getAnomalies(month)` gọi `/api/stats/anomalies`
   theo pattern các hàm `getXxxStats` đã có.

3. `dashboard/src/pages/Reports.jsx` — đọc toàn bộ file trước khi sửa. Nếu cần tham khảo
   cách hiển thị 1 list giao dịch đẹp, xem phần "giao dịch gần đây" trong
   `dashboard/src/pages/Overview.jsx` (chỉ đọc để tham khảo style, KHÔNG sửa file đó).
   Thêm vào `Reports.jsx`:
   - state `anomalies`, fetch cùng `Promise.all` theo `month` trong `useEffect` hiện có.
   - 1 card mới "Giao dịch bất thường" (đặt cuối trang, sau các chart khác) — hiển thị
     DANH SÁCH (không phải chart): mỗi dòng gồm icon category, note (hoặc tên category
     nếu note trống), ngày (format dd/mm từ `created_at`), số tiền (`fmt`), và 1 badge nhỏ
     màu đỏ/cam hiển thị "{times_avg}x trung bình".
   - Empty state khi `anomalies.length === 0`: text "Không có giao dịch bất thường trong
     tháng này 🎉".
   - Không sửa logic/layout nào khác trong file.

4. Test: `python run_api.py`, mở `http://localhost:8000/api/stats/anomalies?month=2026-10`
   kiểm tra JSON hợp lý (có thể rỗng nếu tháng đó chi tiêu đều — không phải lỗi). `cd
   dashboard && npm run dev`, kiểm tra UI hiển thị đúng, rồi `npm run lint` trong
   `dashboard/`.
```
