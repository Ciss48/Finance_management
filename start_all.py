"""
Start both FastAPI and Telegram bot in a single process.
Used for single-service deployment (e.g. Render free tier).
"""
import subprocess
import sys
import signal
import time

processes = []


def shutdown(signum, frame):
    for p in processes:
        p.terminate()
    sys.exit(0)


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

api = subprocess.Popen([sys.executable, "run_api.py"])
bot = subprocess.Popen([sys.executable, "run_bot.py"])
processes = [api, bot]

print("Both API and bot started.")

while True:
    for p in processes:
        if p.poll() is not None:
            print(f"Process {p.args} exited with code {p.returncode}. Shutting down.")
            shutdown(None, None)
    time.sleep(2)
