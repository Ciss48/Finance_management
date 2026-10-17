# Dashboard Analytics Expansion — Kế hoạch triển khai

Mục tiêu: bổ sung các phân tích chi tiêu đa chiều hơn vào trang **"Báo cáo chi tiết"**
(`dashboard/src/pages/Reports.jsx`) — hiện tại trang này mới chỉ có: tổng thu/chi/số dư,
chart chi tiêu theo ngày (stacked by category), top 7 category (bar), tỷ lệ category (pie).
Chưa có: theo tuần, theo thứ trong tuần, theo giờ, xu hướng nhiều tháng, lịch sử tuân thủ
budget, so sánh tháng, phát hiện bất thường.

> Lưu ý: trong repo đã có sẵn `task/task_1.md` .. `task/task_6.md` từ một đợt việc khác
> (sửa màu, đổi tên trang, thêm label...) — không liên quan tới kế hoạch này. Các file của
> kế hoạch này nằm riêng trong `task/dashboard-analytics/` để không bị lẫn.

## Nguyên tắc chung cho mọi task

- **Backend**: thêm endpoint mới trong `api/routes/stats.py`, theo đúng pattern đã có —
  dùng `get_client()` (từ `api/database.py`), lọc theo `created_at` với
  `.gte()/.lt()` giống các hàm `daily_stats`, `monthly_stats`, `yearly_stats` hiện tại.
  Backend phải trả JSON đã group/tính sẵn — không đẩy việc tính toán nặng cho frontend.
- **Frontend**: thêm hàm gọi API tương ứng vào `dashboard/src/api.js` (theo pattern các
  hàm `getXxxStats` hiện có), thêm section/chart mới vào `Reports.jsx`, dùng Recharts và
  tái dùng `CustomTooltip`, `getCatColor`, `fmtShort`, `fmt`, class `"card"` / `"section-header"`
  đã có sẵn trong file để UI đồng bộ với phần còn lại của trang.
- Không sửa `Overview.jsx` / `YearlyReport.jsx` trừ khi task nói rõ.
- Không cần migration DB mới cho các task 1–7 — toàn bộ dựa trên cột `transactions.created_at`
  (timestamptz) đã có sẵn.
- `created_at` lưu theo UTC — **mọi phân tích theo giờ-trong-ngày phải cộng thêm 7 giờ**
  (Asia/Ho_Chi_Minh, không có DST) trước khi lấy `.hour`, nếu không pattern sẽ lệch múi giờ.
- Sau khi code xong một task: chạy thử `python run_api.py` (venv đã activate) +
  `cd dashboard && npm run dev`, mở trình duyệt kiểm tra chart hiển thị đúng — thử cả
  tháng có dữ liệu và tháng trống (empty state không được crash). Chạy `npm run lint`
  trong `dashboard/` trước khi coi là xong. Không có test suite nào khác trong repo.
- Mỗi task độc lập — làm xong 1 task, test ổn, rồi mới chuyển sang task kế tiếp.

## Danh sách task

| # | Task | File | Trạng thái |
|---|------|------|-----------|
| 1 | Chi tiêu theo tuần trong tháng + so với tuần trước (đã mở rộng: stacked by category) | `task_1.md` | ✅ |
| 2 | Chi tiêu theo thứ trong tuần (pattern thói quen) | `task_2.md` | ✅ |
| 3 | Chi tiêu theo giờ trong ngày (dayparts) | `task_3.md` | ❌ (đã gỡ bỏ theo yêu cầu, 2026-10-17) |
| 4 | Xu hướng 1 category qua nhiều tháng + trung bình động | `task_4.md` | ✅ |
| 5 | Lịch sử tuân thủ budget + dự báo cuối tháng (burn-rate) | `task_5.md` | ✅ |
| 6 | So sánh tháng này vs tháng trước theo category | `task_6.md` | ✅ |
| 7 | Phát hiện giao dịch bất thường (anomaly) | `task_7.md` | ✅ |

Đánh dấu ⬜ → ✅ ở bảng trên sau khi mỗi task hoàn thành và đã test được trên UI.

## Cách dùng khi triển khai qua nhiều session

Mỗi file `task_N.md` tự chứa đủ context (không cần nhớ hội thoại cũ):
- Scope chính xác (backend cần thêm gì, frontend cần thêm gì)
- Spec chi tiết của endpoint mới (response shape, cách tính)
- Note kỹ thuật/pattern cần theo đúng
- Một đoạn **"Prompt cho Claude Code"** sẵn để copy nguyên văn vào session mới

Quy trình: mở session mới → dán prompt của `task_N.md` → Claude Code đọc file đó + code →
test xong → báo lại ở session kế hoạch (session này, nếu còn mở) hoặc tự lấy prompt của
`task_{N+1}.md` cho session tiếp theo.
