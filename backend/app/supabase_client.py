import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise ValueError("SUPABASE_URL is not configured.")

    if not service_role_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not configured.")

    return create_client(url, service_role_key)