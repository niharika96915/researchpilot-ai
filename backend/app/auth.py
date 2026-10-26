from fastapi import Header, HTTPException

from app.supabase_client import get_supabase


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required.",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header.",
        )

    access_token = authorization.split(" ", 1)[1].strip()

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Access token is missing.",
        )

    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(access_token)
    except Exception as error:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token.",
        ) from error

    user = response.user

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User authentication failed.",
        )

    return user