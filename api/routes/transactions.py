from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from api.database import get_client

router = APIRouter()


class TransactionCreate(BaseModel):
    amount: float
    category_id: Optional[str] = None
    note: Optional[str] = None
    type: str = "expense"
    source: str = "api"


@router.get("")
def list_transactions(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    month: Optional[str] = Query(None, description="Filter by month YYYY-MM"),
    category_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    db = get_client()
    query = db.table("transactions").select("*, categories(id, name, icon, type)").order("created_at", desc=True)

    if date:
        query = query.gte("created_at", f"{date}T00:00:00+00:00").lte("created_at", f"{date}T23:59:59+00:00")
    elif month:
        query = query.gte("created_at", f"{month}-01T00:00:00+00:00").lt(
            "created_at", _next_month(month) + "-01T00:00:00+00:00"
        )

    if category_id:
        query = query.eq("category_id", category_id)

    query = query.limit(limit)
    result = query.execute()
    return result.data


@router.post("", status_code=201)
def create_transaction(payload: TransactionCreate):
    if payload.type not in ("expense", "income"):
        raise HTTPException(status_code=400, detail="type must be 'expense' or 'income'")
    db = get_client()
    data = payload.model_dump(exclude_none=True)
    result = db.table("transactions").insert(data).execute()
    return result.data[0]


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: str):
    db = get_client()
    result = db.table("transactions").delete().eq("id", transaction_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found")


def _next_month(month: str) -> str:
    year, m = map(int, month.split("-"))
    m += 1
    if m > 12:
        m = 1
        year += 1
    return f"{year:04d}-{m:02d}"
