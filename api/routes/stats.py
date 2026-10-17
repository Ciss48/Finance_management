from fastapi import APIRouter, Query
from typing import Optional
from datetime import date, datetime, timedelta
from calendar import monthrange
import statistics
from api.database import get_client
from api.routes.transactions import _next_month

router = APIRouter()

WEEKDAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]


def _current_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _month_day_range(month: str) -> list[str]:
    """Danh sách YYYY-MM-DD từ ngày 1 đến hết tháng — hoặc đến hôm nay nếu là tháng hiện tại."""
    year, m = map(int, month.split("-"))
    last_day = monthrange(year, m)[1]
    if month == _current_month():
        last_day = min(last_day, datetime.utcnow().day)
    start = date(year, m, 1)
    return [(start + timedelta(days=i)).isoformat() for i in range(last_day)]


@router.get("/daily")
def daily_stats(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select("amount, type, created_at").gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    # Aggregate by day — khởi tạo đủ mọi ngày trong tháng (0đ cho ngày không chi tiêu)
    daily: dict[str, dict] = {day: {"date": day, "expense": 0, "income": 0} for day in _month_day_range(target_month)}
    for row in result.data:
        day = row["created_at"][:10]
        if day not in daily:
            daily[day] = {"date": day, "expense": 0, "income": 0}
        if row["type"] == "expense":
            daily[day]["expense"] += float(row["amount"])
        else:
            daily[day]["income"] += float(row["amount"])

    return sorted(daily.values(), key=lambda x: x["date"])


@router.get("/daily-by-category")
def daily_stats_by_category(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select(
        "amount, created_at, categories(name, type)"
    ).gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).eq("type", "expense").execute()

    # Collect all categories and daily totals (exclude fixed-type categories)
    daily: dict[str, dict] = {day: {"date": day, "label": day[8:10]} for day in _month_day_range(target_month)}
    all_categories: set[str] = set()

    for row in result.data:
        cat = row.get("categories") or {"name": "Khác", "type": "daily"}
        # Bỏ qua danh mục cố định (tiền nhà, gym, đầu tư...) — chúng hiển thị ở mục chi phí cố định
        if cat.get("type") == "fixed":
            continue
        day = row["created_at"][:10]
        cat_name = cat.get("name", "Khác")
        all_categories.add(cat_name)
        if day not in daily:
            daily[day] = {"date": day, "label": day[8:10]}
        daily[day][cat_name] = daily[day].get(cat_name, 0) + float(row["amount"])

    # Fill zeros for missing categories on each day
    for day_data in daily.values():
        for cat_name in all_categories:
            if cat_name not in day_data:
                day_data[cat_name] = 0

    return sorted(daily.values(), key=lambda x: x["date"])


@router.get("/monthly")
def monthly_stats(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    # All transactions for the month
    txn_result = db.table("transactions").select(
        "amount, type, categories(name, icon, type)"
    ).gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    total_expense = sum(float(r["amount"]) for r in txn_result.data if r["type"] == "expense")
    total_income = sum(float(r["amount"]) for r in txn_result.data if r["type"] == "income")

    # Fixed costs from monthly_fixed_costs table
    fixed_result = db.table("monthly_fixed_costs").select(
        "amount, categories(name, icon)"
    ).eq("month", target_month).execute()

    # Also gather fixed-type transactions from transactions table (Đầu tư, etc.)
    fixed_from_txn: dict[str, dict] = {}
    for r in txn_result.data:
        cat = r.get("categories")
        if cat and cat.get("type") == "fixed":
            cat_name = cat["name"]
            if cat_name not in fixed_from_txn:
                fixed_from_txn[cat_name] = {
                    "amount": 0,
                    "categories": {"name": cat_name, "icon": cat.get("icon", "📦")},
                }
            fixed_from_txn[cat_name]["amount"] += float(r["amount"])

    # Merge: monthly_fixed_costs + fixed-type transactions
    all_fixed = list(fixed_result.data)
    existing_names = {r["categories"]["name"] for r in all_fixed if r.get("categories")}
    for name, entry in fixed_from_txn.items():
        if name not in existing_names:
            all_fixed.append(entry)
        else:
            # Add to existing fixed cost entry
            for fc in all_fixed:
                if fc.get("categories", {}).get("name") == name:
                    fc["amount"] = float(fc["amount"]) + entry["amount"]
                    break

    total_fixed = sum(float(r["amount"]) for r in all_fixed)

    # Today totals
    today = _today()
    today_result = db.table("transactions").select("amount, type").gte(
        "created_at", f"{today}T00:00:00+00:00"
    ).lte("created_at", f"{today}T23:59:59+00:00").execute()

    today_expense = sum(float(r["amount"]) for r in today_result.data if r["type"] == "expense")
    today_income = sum(float(r["amount"]) for r in today_result.data if r["type"] == "income")

    # This week
    from datetime import timedelta
    today_dt = datetime.utcnow().date()
    week_start = today_dt - timedelta(days=today_dt.weekday())
    week_result = db.table("transactions").select("amount, type").gte(
        "created_at", f"{week_start.isoformat()}T00:00:00+00:00"
    ).lte("created_at", f"{today}T23:59:59+00:00").execute()

    week_expense = sum(float(r["amount"]) for r in week_result.data if r["type"] == "expense")

    return {
        "month": target_month,
        "total_expense": total_expense,
        "total_income": total_income,
        "total_fixed": total_fixed,
        "variable_expense": total_expense,
        "fixed_costs": all_fixed,
        "today_expense": today_expense,
        "today_income": today_income,
        "week_expense": week_expense,
    }


@router.get("/by-category")
def stats_by_category(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select(
        "amount, type, categories(id, name, icon)"
    ).gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).eq("type", "expense").execute()

    category_totals: dict[str, dict] = {}
    for row in result.data:
        cat = row.get("categories") or {"id": None, "name": "Khác", "icon": "📦"}
        cid = cat.get("id") or "unknown"
        if cid not in category_totals:
            category_totals[cid] = {
                "category_id": cid,
                "name": cat.get("name", "Khác"),
                "icon": cat.get("icon", "📦"),
                "total": 0,
            }
        category_totals[cid]["total"] += float(row["amount"])

    totals = sorted(category_totals.values(), key=lambda x: x["total"], reverse=True)
    grand_total = sum(c["total"] for c in totals)

    for c in totals:
        c["percentage"] = round(c["total"] / grand_total * 100, 1) if grand_total > 0 else 0

    return {"month": target_month, "total": grand_total, "categories": totals}


@router.get("/yearly")
def yearly_stats(year: Optional[int] = Query(None, description="Năm, mặc định năm hiện tại")):
    target_year = year or datetime.utcnow().year
    db = get_client()

    # Lấy toàn bộ transactions trong năm
    txn_result = db.table("transactions").select(
        "amount, type, category_id, created_at, categories(id, name, icon, type)"
    ).gte("created_at", f"{target_year}-01-01T00:00:00+00:00").lt(
        "created_at", f"{target_year + 1}-01-01T00:00:00+00:00"
    ).execute()

    # Lấy fixed costs trong năm
    fixed_result = db.table("monthly_fixed_costs").select(
        "amount, month, categories(name, icon)"
    ).gte("month", f"{target_year}-01").lte("month", f"{target_year}-12").execute()

    # Tổng hợp theo tháng
    monthly: dict[str, dict] = {}
    for m in range(1, 13):
        key = f"{target_year}-{m:02d}"
        monthly[key] = {"month": key, "expense": 0, "income": 0, "fixed": 0}

    for row in txn_result.data:
        m = row["created_at"][:7]
        if m in monthly:
            cat = row.get("categories")
            # Fixed-type transactions count as fixed, not variable expense
            if cat and cat.get("type") == "fixed":
                monthly[m]["fixed"] += float(row["amount"])
            elif row["type"] == "expense":
                monthly[m]["expense"] += float(row["amount"])
            else:
                monthly[m]["income"] += float(row["amount"])

    for row in fixed_result.data:
        m = row["month"]
        if m in monthly:
            monthly[m]["fixed"] += float(row["amount"])

    monthly_list = list(monthly.values())

    # Tổng năm
    total_expense = sum(r["expense"] for r in monthly_list)
    total_income = sum(r["income"] for r in monthly_list)
    total_fixed = sum(r["fixed"] for r in monthly_list)

    # Category breakdown cả năm
    cat_totals: dict[str, dict] = {}
    for row in txn_result.data:
        if row["type"] != "expense":
            continue
        cat = row.get("categories") or {"id": None, "name": "Khác", "icon": "📦"}
        cid = cat.get("id") or "unknown"
        if cid not in cat_totals:
            cat_totals[cid] = {"name": cat.get("name", "Khác"), "icon": cat.get("icon", "📦"), "total": 0}
        cat_totals[cid]["total"] += float(row["amount"])

    categories = sorted(cat_totals.values(), key=lambda x: x["total"], reverse=True)
    grand_total_cat = sum(c["total"] for c in categories)
    for c in categories:
        c["percentage"] = round(c["total"] / grand_total_cat * 100, 1) if grand_total_cat > 0 else 0

    return {
        "year": target_year,
        "total_expense": total_expense,
        "total_income": total_income,
        "total_fixed": total_fixed,
        "total_spending": total_expense + total_fixed,
        "balance": total_income - total_expense - total_fixed,
        "monthly": monthly_list,
        "categories": categories,
    }


@router.get("/weekly")
def weekly_stats(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select(
        "amount, type, created_at, categories(name, type)"
    ).gte(
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

    # Breakdown theo category (bỏ qua fixed-type, giống daily_stats_by_category) để vẽ stacked column
    all_categories: set[str] = set()
    for row in result.data:
        day = row["created_at"][:10]
        d = date.fromisoformat(day)
        week_start = (d - timedelta(days=d.weekday())).isoformat()
        if week_start not in weeks:
            continue
        if row["type"] == "expense":
            weeks[week_start]["expense"] += float(row["amount"])
            cat = row.get("categories") or {"name": "Khác", "type": "daily"}
            if cat.get("type") != "fixed":
                cat_name = cat.get("name", "Khác")
                all_categories.add(cat_name)
                weeks[week_start][cat_name] = weeks[week_start].get(cat_name, 0) + float(row["amount"])
        else:
            weeks[week_start]["income"] += float(row["amount"])

    weeks_list = sorted(weeks.values(), key=lambda x: x["week_start"])

    # Fill zeros for missing categories on each week
    for w in weeks_list:
        for cat_name in all_categories:
            if cat_name not in w:
                w[cat_name] = 0

    for i, w in enumerate(weeks_list):
        prev = weeks_list[i - 1] if i > 0 else None
        w["delta_pct"] = (
            round((w["expense"] - prev["expense"]) / prev["expense"] * 100, 1)
            if prev and prev["expense"] > 0 else None
        )
    return weeks_list


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
