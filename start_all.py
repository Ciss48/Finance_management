"""
Entry point for Render deployment.
The Telegram bot webhook is embedded inside the FastAPI process (api/main.py lifespan).
No separate bot process is needed.
"""
import subprocess
import sys
import signal

process = None


def shutdown(signum, frame):
    if process:
        process.terminate()
    sys.exit(0)


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

process = subprocess.Popen([sys.executable, "run_api.py"])
print("API started (Telegram bot webhook embedded).")
process.wait()
