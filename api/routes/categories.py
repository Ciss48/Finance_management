from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.database import get_client

router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: str | None = None


@router.get("")
def list_categories():
    db = get_client()
    result = db.table("categories").select("*").order("type").order("name").execute()
    return result.data


@router.post("", status_code=201)
def create_category(payload: CategoryCreate):
    if payload.type not in ("daily", "fixed"):
        raise HTTPException(status_code=400, detail="type must be 'daily' or 'fixed'")
    db = get_client()
    result = db.table("categories").insert(payload.model_dump(exclude_none=True)).execute()
    return result.data[0]
