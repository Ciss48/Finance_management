-- Chuyển danh mục "Khác" từ chi phí cố định → chi phí biến động (daily).
--
-- Lý do: monthly_fixed_costs được upsert theo (category_id, month) nên mỗi lần
-- nhập "Khác" giá trị bị GHI ĐÈ thay vì cộng dồn. Là chi phí phát sinh không
-- kiểm soát được, "Khác" cần nằm ở transactions để mỗi lần nhập là 1 giao dịch
-- riêng và được cộng dồn tự nhiên.
--
-- Chạy file này trong Supabase → SQL Editor.

-- 1. Đưa các bản ghi "Khác" đang nằm trong monthly_fixed_costs về transactions.
--    Mỗi tháng chỉ có 1 dòng (do upsert), gán vào ngày 01 của tháng đó.
insert into transactions (amount, type, category_id, note, created_at, source)
select
    fc.amount,
    'expense',
    fc.category_id,
    coalesce(fc.note, 'Chuyển từ chi phí cố định'),
    (fc.month || '-01T12:00:00+00:00')::timestamptz,
    'api'
from monthly_fixed_costs fc
join categories c on c.id = fc.category_id
where c.name = 'Khác';

-- 2. Xoá các dòng "Khác" khỏi bảng chi phí cố định.
delete from monthly_fixed_costs fc
using categories c
where c.id = fc.category_id
  and c.name = 'Khác';

-- 3. Đổi loại danh mục để mọi thống kê coi "Khác" là chi biến động.
update categories set type = 'daily' where name = 'Khác';
