# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal finance tracker: user logs expenses via **Telegram**, views analytics on a **React dashboard**. The bot and API both talk directly to **Supabase (PostgreSQL)**.

```
User → Telegram Bot ──────────────────┐
                                       ▼
                              Supabase (PostgreSQL)
                                       ▲
Web Dashboard (React) → FastAPI ───────┘
```

**Important:** The Telegram bot (`bot/`) calls Supabase directly via `api/database.py` — it does NOT go through FastAPI routes. FastAPI is only used by the dashboard.

---

## Development Commands

### Backend (Python)
```bash
# Activate virtual environment first
source venv/bin/activate

# Run API server (hot-reload enabled)
python run_api.py

# Run Telegram bot
python run_bot.py
```

### Frontend (Dashboard)
```bash
cd dashboard
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build to dashboard/dist/
npm run lint     # eslint check
```

The dashboard reads `VITE_API_URL` from `dashboard/.env` (defaults to `http://localhost:8000`).

---

## Architecture Details

### Parser Pipeline (`bot/parser.py`)
Message parsing follows a strict priority order:
1. Extract explicit date if present (`ngày 25/3` → `YYYY-MM-DD`)
2. Detect income via `+` prefix or keywords (`lương`, `thu nhập`, etc.)
3. Parse amount — supports: `150000`, `150k`, `1.5tr`, `5tr2` (=5,200,000), `5tr230` (=5,230,000)
4. **Fixed cost check** (`FIXED_COST_RULES`) → writes to `monthly_fixed_costs` table, upserted per month
5. **Keyword match** (`KEYWORD_RULES`) — exact/word-boundary match, higher priority than fuzzy
6. **Fuzzy match** fallback using `SequenceMatcher` with 0.4 score threshold

When no category is found for an expense, `handlers.py` stores the parsed transaction in an **in-memory `_pending` dict** (keyed by Telegram user ID) and sends an inline keyboard for the user to pick a category.

### Actual Daily Categories (in `KEYWORD_RULES`)
The implemented categories differ from the initial spec:
- Ăn uống, Cà phê, Xăng xe, Du lịch, Di chuyển, Giải trí/Bạn bè, Tạp hóa / Chợ / Siêu thị, Mua sắm, Sức khỏe

Fixed categories: Tiền nhà, Tiền gym, Tiền Claude Code

### API Routes
All prefixed with `/api/`:
- `transactions` — GET (filters: `date`, `month`, `category_id`, `limit`), POST, DELETE `/{id}`
- `categories` — GET, POST
- `stats/daily` — daily totals for a month (`?month=YYYY-MM`)
- `stats/monthly` — today/week/month summary + fixed costs
- `stats/by-category` — expense breakdown with percentages
- `stats/yearly` — full year breakdown by month + category totals

### Dashboard Pages (`dashboard/src/pages/`)
- `Overview` — today/week/month summary cards + fixed costs
- `Transactions` — paginated list with delete
- `Categories` — category management
- `Reports` — monthly charts (daily trend, category pie/bar)
- `YearlyReport` — year-over-year monthly chart + category breakdown

All API calls are centralized in `dashboard/src/api.js`. Currency formatting utilities are in `dashboard/src/utils.js` (`fmt`, `fmtShort` for VND).

### Database Client
`api/database.py` exposes a singleton `get_client()` that uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses row-level security). All DB access throughout the app must go through this function.

---

## Coding Standards

- `config.py` is the single file that reads `.env` — import env vars from there, never call `os.getenv()` elsewhere
- Python venv is at `venv/` — always activate before running
- FastAPI routes organized by resource in `api/routes/`
- No tests currently exist in the project

---

## Phase Roadmap

| Phase | Scope |
|-------|-------|
| ✅ Phase 1 | Telegram bot input + Supabase storage + Web dashboard |
| Phase 2 | Auto-read bank SMS → auto-detect transactions |
| Phase 3 | Budget goals, alerts, monthly reports |
