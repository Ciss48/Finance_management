import logging
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, MessageHandler, filters

from api.database import get_client
from bot.parser import parse_message

logger = logging.getLogger(__name__)

# Lưu tạm giao dịch đang chờ chọn danh mục
_pending: dict[int, dict] = {}


def _get_categories() -> list[dict]:
    db = get_client()
    result = db.table("categories").select("*").order("type").order("name").execute()
    return result.data


def _save_transaction(parsed: dict) -> dict:
    db = get_client()
    data = {
        "amount": parsed["amount"],
        "type": parsed["type"],
        "source": "telegram",
    }
    if parsed.get("category"):
        data["category_id"] = parsed["category"]["id"]
    if parsed.get("note"):
        data["note"] = parsed["note"]

    # Ngày cụ thể ("ngày 25/3") ưu tiên cao nhất
    if parsed.get("transaction_date"):
        data["created_at"] = f"{parsed['transaction_date']}T12:00:00+00:00"
    # Thu nhập có ghi tháng → ngày 1 của tháng đó
    elif parsed.get("income_month"):
        data["created_at"] = f"{parsed['income_month']}-01T12:00:00+00:00"

    result = db.table("transactions").insert(data).execute()
    return result.data[0]


def _save_fixed_cost(parsed: dict) -> dict:
    """Upsert vào monthly_fixed_costs cho tháng hiện tại."""
    db = get_client()
    month = datetime.utcnow().strftime("%Y-%m")
    category_id = parsed["category"]["id"]

    # Kiểm tra đã có chưa
    existing = db.table("monthly_fixed_costs").select("id").eq(
        "category_id", category_id
    ).eq("month", month).execute()

    data = {
        "category_id": category_id,
        "amount": parsed["amount"],
        "month": month,
        "note": parsed.get("note"),
    }

    if existing.data:
        # Cập nhật
        result = db.table("monthly_fixed_costs").update(
            {"amount": parsed["amount"], "note": parsed.get("note")}
        ).eq("id", existing.data[0]["id"]).execute()
    else:
        result = db.table("monthly_fixed_costs").insert(data).execute()

    return result.data[0]


def _fmt(amount: int) -> str:
    return f"{amount:,.0f}đ".replace(",", ".")


def _confirmation_text(parsed: dict) -> str:
    amount_str = _fmt(parsed["amount"])
    cat = parsed.get("category")
    cat_name = cat["name"] if cat else "Không rõ"
    icon = cat["icon"] if cat else "📦"
    note_str = f' — "{parsed["note"]}"' if parsed.get("note") else ""

    if parsed.get("is_fixed_cost"):
        month = datetime.utcnow().strftime("%Y-%m")
        return f"🔒 Đã cập nhật chi phí cố định: {amount_str} — {icon} {cat_name} (tháng {month}){note_str}"

    if parsed["type"] == "income":
        month_label = f" (tháng {parsed['income_month']})" if parsed.get("income_month") else ""
        return f"💰 Đã lưu thu nhập: {amount_str}{month_label}{note_str}"

    date_label = f" [{parsed['transaction_date']}]" if parsed.get("transaction_date") else ""
    return f"✅ Đã lưu: {amount_str} — {icon} {cat_name}{note_str}{date_label}"


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.effective_user.id

    categories = _get_categories()
    parsed = parse_message(text, categories)

    if parsed is None:
        await update.message.reply_text(
            "❓ Không hiểu định dạng.\nThử: `150k ăn trưa`, `65k cà phê`, `5tr tiền nhà`",
            parse_mode="Markdown",
        )
        return

    # Chi phí cố định
    if parsed["is_fixed_cost"]:
        _save_fixed_cost(parsed)
        await update.message.reply_text(_confirmation_text(parsed))
        return

    # Không tìm được danh mục → hỏi người dùng (chỉ với expense)
    if parsed["category"] is None and parsed["type"] != "income":
        _pending[user_id] = parsed

        keyboard = []
        row = []
        daily_cats = [c for c in categories if c["type"] == "daily"]
        for i, cat in enumerate(daily_cats):
            row.append(InlineKeyboardButton(
                f"{cat['icon']} {cat['name']}",
                callback_data=f"cat:{cat['id']}"
            ))
            if len(row) == 2:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)

        await update.message.reply_text(
            f"❓ Không nhận ra danh mục trong: *{text}*\nChọn danh mục:",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return

    _save_transaction(parsed)
    await update.message.reply_text(_confirmation_text(parsed))


async def handle_category_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = update.effective_user.id
    data = query.data

    if not data.startswith("cat:"):
        return

    category_id = data[4:]
    pending = _pending.pop(user_id, None)

    if pending is None:
        await query.edit_message_text("⚠️ Phiên đã hết hạn. Vui lòng nhập lại.")
        return

    db = get_client()
    cat_result = db.table("categories").select("*").eq("id", category_id).execute()
    if not cat_result.data:
        await query.edit_message_text("❌ Không tìm thấy danh mục.")
        return

    pending["category"] = cat_result.data[0]
    _save_transaction(pending)
    await query.edit_message_text(_confirmation_text(pending))
