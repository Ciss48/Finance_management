# Personal Finance Management System

Track your expenses via Telegram and view analytics on a web dashboard.

## Architecture

```
Telegram Bot → FastAPI Backend → Supabase (PostgreSQL)
                                        ↓
                                 React Dashboard
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- A Supabase project (already configured)
- A Telegram bot token

## Setup

### 1. Clone & configure

```bash
cp .env.example .env
# Fill in your values in .env
```

### 2. Python backend & bot

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Dashboard

```bash
cd dashboard
npm install
```

## Running locally

### Start the API server

```bash
source venv/bin/activate
python run_api.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Start the Telegram bot (separate terminal)

```bash
source venv/bin/activate
python run_bot.py
```

### Start the dashboard (separate terminal)

```bash
cd dashboard
npm run dev
# Dashboard at http://localhost:5173
```

## Telegram Bot Usage

Send messages to your bot in these formats:

```
# Expense (default)
150000 ăn uống
50k di chuyển
200k mua sắm quần áo nike
1.5tr tiền nhà tháng 3

# With note
150000 ăn uống cơm trưa văn phòng

# Income
+5000000 thu nhập lương tháng 3
```

If the category isn't recognized, the bot will show inline buttons for you to pick one.

## API Documentation

Once running, visit [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

### Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List transactions (params: `date`, `month`, `category_id`) |
| POST | `/api/transactions` | Create transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/stats/daily?month=YYYY-MM` | Daily spending chart data |
| GET | `/api/stats/monthly?month=YYYY-MM` | Monthly summary |
| GET | `/api/stats/by-category?month=YYYY-MM` | Category breakdown |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Add category |

## Environment Variables

See `.env.example` for all required variables.
