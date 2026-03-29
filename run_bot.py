import logging
from telegram import Update
from telegram.ext import Application, MessageHandler, CallbackQueryHandler, filters

from config import TELEGRAM_BOT_TOKEN
from bot.handlers import handle_message, handle_category_callback

logging.basicConfig(
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger(__name__)


def main():
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CallbackQueryHandler(handle_category_callback, pattern=r"^cat:"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Bot started. Polling...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
