from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import transactions, categories, stats

app = FastAPI(title="Finance Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Finance Management API"}
