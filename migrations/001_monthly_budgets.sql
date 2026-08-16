-- Ngân sách theo tháng — lưu để dashboard tự động hiển thị lại ở lần truy cập sau.
-- Chạy file này trong Supabase → SQL Editor.

create table if not exists monthly_budgets (
    id          uuid primary key default gen_random_uuid(),
    month       text not null unique,   -- 'YYYY-MM'
    amount      numeric not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists monthly_budgets_month_idx on monthly_budgets (month);
