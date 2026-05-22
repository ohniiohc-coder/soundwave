import os
from fastapi import Header, HTTPException

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "local-dev-key")


def verify_admin(x_api_key: str | None = Header(default=None)) -> None:
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
