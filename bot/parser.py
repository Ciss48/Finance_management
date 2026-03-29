import re
from datetime import datetime
from difflib import SequenceMatcher

# ---------------------------------------------------------------------------
# Keyword rules — ưu tiên hơn fuzzy match
# Thứ tự quan trọng: từ khoá dài/cụ thể trước
# ---------------------------------------------------------------------------
KEYWORD_RULES = [
    ("Ăn uống",                  ["ăn sáng", "ăn trưa", "ăn tối", "ăn với", "ăn ngoài", "ăn uống", "ăn"]),
    ("Cà phê",                   ["cà phê", "cafe", "coffee", "trà sữa", "trà", "matcha"]),
    ("Xăng xe",                  ["đổ xăng", "xăng xe", "xăng"]),
    ("Du lịch",                  ["du lịch"]),
    ("Di chuyển",                ["máy bay", "đặt xe", "grab", "gojek", "bus", "xe bus", "tàu hỏa", "tàu", "di chuyển", "taxi"]),
    ("Giải trí/Bạn bè",         ["đi chơi", "bạn bè", "tụ họp", "giải trí", "net", "game"]),
    ("Tạp hóa / Chợ / Siêu thị",["siêu thị", "tạp hóa", "chợ"]),
    ("Mua sắm",                  ["mua sắm", "shopee", "tiktok shop", "tiktok", "lazada", "shopping"]),
    ("Sức khỏe",                 ["sức khỏe", "khám bệnh", "bác sĩ", "thuốc"]),
]

# Danh mục chi phí cố định — khi khớp thì ghi vào monthly_fixed_costs
FIXED_COST_RULES = [
    ("Tiền nhà",       ["tiền nhà", "tiền thuê nhà", "nhà"]),
    ("Tiền gym",       ["tiền gym", "gym"]),
    ("Tiền Claude Code", ["claude code", "claude", "tiền claude"]),
]

# Từ khoá thu nhập
INCOME_KEYWORDS = ["thu nhập", "lương", "thưởng", "tiền thu", "thu "]

# Pattern tháng: "tháng 3", "tháng 03"
MONTH_PATTERN = re.compile(r'tháng\s*(\d{1,2})', re.IGNORECASE)

# Pattern ngày: "ngày 25/3", "ngày 25/3/2026", "ngày 25-3", "ngày 25-3-2026"
DATE_PATTERN = re.compile(
    r'ngày\s+(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{4}))?',
    re.IGNORECASE
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_amount(raw: str) -> int | None:
    """Chuyển đổi chuỗi số VND:
      150000, 150k, 1.5tr, 5tr2 (=5,200,000), 5tr230 (=5,230,000) → int
    """
    raw = raw.strip().lower().replace(",", ".")
    is_negative = raw.startswith("-")
    raw = raw.lstrip("+-")

    # Dạng: 5tr2, 5tr230, 1.5tr, 5tr — số + "tr"/"triệu" + tuỳ chọn phần lẻ
    tr_match = re.match(r"^([\d.]+)\s*tr(?:iệu)?(\d*)$", raw)
    if tr_match:
        n = float(tr_match.group(1))
        m_str = tr_match.group(2)
        if m_str:
            # 5tr2 → 5,200,000 ; 5tr230 → 5,230,000
            # m_str là phần thập phân tính theo triệu → nhân với 10^(6-len)
            power = 6 - len(m_str)
            if power < 0:
                power = 0
            m_val = int(m_str) * (10 ** power)
            val = int(n) * 1_000_000 + m_val
        else:
            val = n * 1_000_000
        return -int(val) if is_negative else int(val)

    k_match = re.match(r"^([\d.]+)\s*k$", raw)
    if k_match:
        val = float(k_match.group(1)) * 1_000
        return -int(val) if is_negative else int(val)

    plain_match = re.match(r"^([\d.]+)$", raw)
    if plain_match:
        val = float(plain_match.group(1))
        return -int(val) if is_negative else int(val)

    return None


def extract_date(text: str) -> tuple[str | None, str]:
    """
    Tìm 'ngày DD/MM' hoặc 'ngày DD/MM/YYYY' trong text.
    Trả về (ISO date string, text đã bỏ phần ngày) hoặc (None, text gốc).
    """
    m = DATE_PATTERN.search(text)
    if not m:
        return None, text
    day = int(m.group(1))
    month = int(m.group(2))
    year = int(m.group(3)) if m.group(3) else datetime.now().year
    try:
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        # Validate
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None, text
    # Bỏ cụm "ngày DD/MM..." ra khỏi text để không ảnh hưởng category matching
    clean = (text[:m.start()] + text[m.end():]).strip()
    return date_str, clean


def extract_month(text: str) -> str | None:
    """Trích xuất tháng từ text, VD: 'tháng 3' → '2026-03'. None nếu không tìm thấy."""
    m = MONTH_PATTERN.search(text)
    if m:
        month_num = int(m.group(1))
        if 1 <= month_num <= 12:
            year = datetime.now().year
            return f"{year}-{month_num:02d}"
    return None


def _match_keywords(text: str, keywords: list[str]) -> bool:
    """Kiểm tra text (lowercase) có chứa keyword nào không.
    Dùng word-boundary để tránh 'ăn' match trong 'xăng'."""
    t = text.lower()
    for kw in keywords:
        if kw not in t:
            continue
        # Kiểm tra kw xuất hiện như 1 từ riêng (không dính vào ký tự chữ trước/sau)
        idx = t.find(kw)
        before_ok = (idx == 0) or (not t[idx - 1].isalpha())
        after_idx = idx + len(kw)
        after_ok = (after_idx >= len(t)) or (not t[after_idx].isalpha())
        if before_ok and after_ok:
            return True
    return False


def _find_category_by_name(name: str, categories: list[dict]) -> dict | None:
    for c in categories:
        if c["name"] == name:
            return c
    return None


def match_by_keywords(text: str, categories: list[dict]) -> dict | None:
    """Ưu tiên match theo keyword rules trước."""
    for cat_name, keywords in KEYWORD_RULES:
        if _match_keywords(text, keywords):
            cat = _find_category_by_name(cat_name, categories)
            if cat:
                return cat
    return None


def match_fixed_cost(text: str, categories: list[dict]) -> dict | None:
    """Kiểm tra xem text có phải chi phí cố định không."""
    for cat_name, keywords in FIXED_COST_RULES:
        if _match_keywords(text, keywords):
            cat = _find_category_by_name(cat_name, categories)
            if cat:
                return cat
    return None


def fuzzy_score(a: str, b: str) -> float:
    """Score mức độ giống nhau giữa candidate a và tên danh mục b."""
    a = a.lower().strip()
    b = b.lower().strip()
    if a == b:
        return 1.0
    if a in b:
        return 0.9
    return SequenceMatcher(None, a, b).ratio()


def match_by_fuzzy(text: str, categories: list[dict]) -> tuple[dict | None, str]:
    """Fuzzy match — fallback khi keyword không khớp. Trả về (category, note)."""
    words = text.strip().split()
    best_cat = None
    best_score = 0.4
    best_end = 0

    for n in range(1, min(len(words) + 1, 6)):
        candidate = " ".join(words[:n])
        for cat in categories:
            score = fuzzy_score(candidate, cat["name"])
            if score > best_score or (score == best_score and n > best_end and score > 0.4):
                best_score = score
                best_cat = cat
                best_end = n

    remaining = " ".join(words[best_end:]) if best_cat else text
    return best_cat, remaining.strip()


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def parse_message(text: str, categories: list[dict]) -> dict | None:
    """
    Parse tin nhắn tài chính. Trả về dict:
      amount           : int (VND)
      category         : dict | None
      note             : str | None
      type             : 'expense' | 'income'
      is_fixed_cost    : bool
      income_month     : str | None  — YYYY-MM
      transaction_date : str | None  — YYYY-MM-DD nếu có 'ngày DD/MM'
    Trả về None nếu không parse được.
    """
    text = text.strip()

    # Chuẩn hoá: "20 triệu" → "20tr"
    text = re.sub(r'(\d+)\s+triệu', r'\1tr', text, flags=re.IGNORECASE)

    # Trích xuất ngày cụ thể nếu có ("ngày 25/3")
    transaction_date, text = extract_date(text)

    # Xác định income/expense qua dấu +
    is_income = text.startswith("+")
    if is_income:
        text = text[1:].strip()

    # --- Thử tìm amount ---
    parts = text.split(None, 1)
    if not parts:
        return None

    amount = parse_amount(parts[0])
    remainder = parts[1].strip() if len(parts) > 1 else ""

    # Nếu token đầu không phải số → có thể là dạng "Lương 20tr" hoặc "thu 20tr"
    if amount is None:
        full_lower = text.lower()
        if _match_keywords(full_lower, INCOME_KEYWORDS):
            # Ưu tiên token có đơn vị (k/tr) trước, fallback mới lấy số thuần
            amt_match = re.search(
                r'(?<!\w)([\d.,]+\s*(?:tr(?:iệu)?\d+|tr(?:iệu)?|k))(?!\w)',
                text, re.IGNORECASE
            )
            if not amt_match:
                amt_match = re.search(r'(?<!\w)(\d+)(?!\w)', text)
            if amt_match:
                amount = parse_amount(amt_match.group(1).strip())
            if amount:
                remainder = (text[:amt_match.start()] + text[amt_match.end():]).strip()
                income_month = extract_month(remainder)
                return {
                    "amount": amount,
                    "category": None,
                    "note": remainder or None,
                    "type": "income",
                    "is_fixed_cost": False,
                    "income_month": income_month,
                    "transaction_date": transaction_date,
                }
        return None

    # --- Phát hiện thu nhập qua từ khoá trong phần còn lại ---
    income_month = None
    if not is_income and _match_keywords(remainder, INCOME_KEYWORDS):
        is_income = True

    if is_income:
        income_month = extract_month(remainder)
        return {
            "amount": amount,
            "category": None,
            "note": remainder or None,
            "type": "income",
            "is_fixed_cost": False,
            "income_month": income_month,
            "transaction_date": transaction_date,
        }

    # --- Phát hiện chi phí cố định ---
    fixed_cat = match_fixed_cost(remainder, categories)
    if fixed_cat:
        note = _strip_fixed_keywords(remainder, fixed_cat["name"])
        return {
            "amount": amount,
            "category": fixed_cat,
            "note": note or None,
            "type": "expense",
            "is_fixed_cost": True,
            "income_month": None,
            "transaction_date": transaction_date,
        }

    # --- Match category ---
    cat = match_by_keywords(remainder, categories)
    if cat:
        note = _strip_matched_keywords(remainder, cat["name"])
    else:
        cat, note = match_by_fuzzy(remainder, categories)

    return {
        "amount": amount,
        "category": cat,
        "note": note or None,
        "type": "income" if is_income else "expense",
        "is_fixed_cost": False,
        "income_month": income_month,
        "transaction_date": transaction_date,
    }


def _strip_fixed_keywords(text: str, cat_name: str) -> str:
    """Bỏ từ khoá fixed cost ra khỏi text để lấy note."""
    for _, keywords in FIXED_COST_RULES:
        for kw in sorted(keywords, key=len, reverse=True):
            text_lower = text.lower()
            if kw in text_lower:
                idx = text_lower.index(kw)
                text = (text[:idx] + text[idx + len(kw):]).strip()
                break
    return text.strip()


def _strip_matched_keywords(text: str, cat_name: str) -> str:
    """Bỏ keyword đã match ra khỏi text để lấy note."""
    for name, keywords in KEYWORD_RULES:
        if name != cat_name:
            continue
        t = text.lower()
        for kw in sorted(keywords, key=len, reverse=True):
            if kw in t:
                idx = t.index(kw)
                text = (text[:idx] + text[idx + len(kw):]).strip()
                return text.strip()
    return text.strip()
