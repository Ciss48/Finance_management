"""
Keepalive ping for Render free tier.
Run by a Render cron job every 14 minutes to prevent service spin-down.
"""
import urllib.request
import sys

URL = "https://finance-management-7v45.onrender.com/"

try:
    with urllib.request.urlopen(URL, timeout=30) as response:
        print(f"Ping OK — status {response.status}")
except Exception as exc:
    print(f"Ping failed: {exc}", file=sys.stderr)
    sys.exit(1)
