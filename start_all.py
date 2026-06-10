"""
Entry point for Render deployment.
The Telegram bot webhook is embedded inside the FastAPI process (api/main.py lifespan).
Auto-restarts the API process if it crashes.
"""
import subprocess
import sys
import signal
import time

_shutdown = False


def shutdown(signum, frame):
    global _shutdown
    _shutdown = True
    sys.exit(0)


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

while not _shutdown:
    print("Starting API...", flush=True)
    process = subprocess.Popen([sys.executable, "run_api.py"])
    process.wait()
    if _shutdown:
        break
    code = process.returncode
    print(f"API exited (code {code}), restarting in 3s...", flush=True)
    time.sleep(3)
