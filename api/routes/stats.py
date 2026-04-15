from fastapi import APIRouter, Query
from typing import Optional
from datetime import date, datetime
from api.database import get_client
from api.routes.transactions import _next_month

router = APIRouter()


def _current_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


@router.get("/daily")
def daily_stats(month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month")):
    target_month = month or _current_month()
    db = get_client()

    result = db.table("transactions").select("amount, type, created_at").gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    # Aggregate by day
    daily: dict[str, dict] = {}
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
        "amount, created_at, categories(name)"
    ).gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).eq("type", "expense").execute()

    # Collect all categories and daily totals
    daily: dict[str, dict] = {}
    all_categories: set[str] = set()

    for row in result.data:
        day = row["created_at"][:10]
        cat = row.get("categories") or {"name": "Khác"}
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
    txn_result = db.table("transactions").select("amount, type").gte(
        "created_at", f"{target_month}-01T00:00:00+00:00"
    ).lt(
        "created_at", _next_month(target_month) + "-01T00:00:00+00:00"
    ).execute()

    total_expense = sum(float(r["amount"]) for r in txn_result.data if r["type"] == "expense")
    total_income = sum(float(r["amount"]) for r in txn_result.data if r["type"] == "income")

    # Fixed costs for the month
    fixed_result = db.table("monthly_fixed_costs").select(
        "amount, categories(name, icon)"
    ).eq("month", target_month).execute()

    total_fixed = sum(float(r["amount"]) for r in fixed_result.data)

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
        "fixed_costs": fixed_result.data,
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
        "amount, type, category_id, created_at, categories(id, name, icon)"
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
            if row["type"] == "expense":
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
