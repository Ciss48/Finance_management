from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from api.database import get_client

router = APIRouter()

_MISSING_TABLE_HINT = (
    "Bảng 'monthly_budgets' chưa tồn tại. "
    "Chạy migrations/001_monthly_budgets.sql trong Supabase SQL Editor."
)


class BudgetUpsert(BaseModel):
    month: str
    amount: float


def _current_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def _validate_month(month: str) -> str:
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=400, detail="month must be 'YYYY-MM'")
    return month


def _missing_table(exc: Exception) -> bool:
    """Supabase/PostgREST báo lỗi khác nhau tùy version khi bảng chưa tồn tại."""
    text = str(exc)
    return "monthly_budgets" in text and (
        "PGRST205" in text or "42P01" in text or "does not exist" in text
    )


@router.get("")
def get_budget(month: Optional[str] = Query(None, description="YYYY-MM, mặc định tháng hiện tại")):
    target_month = _validate_month(month) if month else _current_month()
    db = get_client()

    try:
        result = db.table("monthly_budgets").select("month, amount").eq(
            "month", target_month
        ).limit(1).execute()
    except Exception as exc:
        if _missing_table(exc):
            raise HTTPException(status_code=503, detail=_MISSING_TABLE_HINT)
        raise

    if not result.data:
        return {"month": target_month, "amount": 0}
    return {"month": target_month, "amount": float(result.data[0]["amount"])}


@router.put("")
def upsert_budget(payload: BudgetUpsert):
    target_month = _validate_month(payload.month)
    if payload.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")

    db = get_client()
    row = {
        "month": target_month,
        "amount": payload.amount,
        "updated_at": datetime.utcnow().isoformat(),
    }

    try:
        result = db.table("monthly_budgets").upsert(row, on_conflict="month").execute()
    except Exception as exc:
        if _missing_table(exc):
            raise HTTPException(status_code=503, detail=_MISSING_TABLE_HINT)
        raise

    saved = result.data[0] if result.data else row
    return {"month": target_month, "amount": float(saved["amount"])}
