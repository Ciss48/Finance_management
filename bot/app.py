from telegram.ext import Application, MessageHandler, CallbackQueryHandler, filters

from config import TELEGRAM_BOT_TOKEN
from bot.handlers import handle_message, handle_category_callback


def create_application() -> Application:
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    application.add_handler(CallbackQueryHandler(handle_category_callback, pattern=r"^cat:"))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    return application
