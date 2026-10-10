import httpx
from supabase import create_client, Client, ClientOptions
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        # postgrest-py mặc định bật http2=True trên httpx.Client dùng chung cho mọi
        # request. FastAPI chạy các route sync trong threadpool, nên nhiều request
        # chạm DB cùng lúc (vd. Overview load ~7 API song song) sẽ multiplex trên
        # CÙNG một kết nối HTTP/2 — thỉnh thoảng gây httpx.ReadError: "Resource
        # temporarily unavailable". Tắt http2 để mỗi request lấy 1 kết nối riêng
        # từ pool (HTTP/1.1), tránh race condition này.
        httpx_client = httpx.Client(http2=False)
        _client = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            options=ClientOptions(httpx_client=httpx_client),
        )
    return _client
