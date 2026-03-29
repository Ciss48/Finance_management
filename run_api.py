import uvicorn
from config import APP_PORT, APP_ENV

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=APP_PORT, reload=APP_ENV == "development")
