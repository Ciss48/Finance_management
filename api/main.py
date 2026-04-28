import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from telegram import Update

from api.routes import transactions, categories, stats
from bot.app import create_application
from config import WEBHOOK_URL, WEBHOOK_SECRET

logger = logging.getLogger(__name__)

_bot_app = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _bot_app
    _bot_app = create_application()
    await _bot_app.initialize()

    if WEBHOOK_URL:
        webhook_endpoint = f"{WEBHOOK_URL}/api/telegram/webhook"
        await _bot_app.bot.set_webhook(
            url=webhook_endpoint,
            secret_token=WEBHOOK_SECRET or None,
            allowed_updates=["message", "callback_query"],
        )
        logger.info("Telegram webhook registered: %s", webhook_endpoint)
    else:
        logger.info("WEBHOOK_URL not set — webhook not registered (use run_bot.py for local polling)")

    await _bot_app.start()
    yield

    await _bot_app.stop()
    await _bot_app.shutdown()


app = FastAPI(title="Finance Management API", version="1.0.0", lifespan=lifespan)

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


@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    if WEBHOOK_SECRET:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if secret != WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="Forbidden")

    data = await request.json()
    update = Update.de_json(data, _bot_app.bot)
    await _bot_app.process_update(update)
    return Response(status_code=200)
