import os
from pathlib import Path

import razorpay
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)


def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if not key_id:
        raise ValueError("RAZORPAY_KEY_ID is not configured.")

    if not key_secret:
        raise ValueError("RAZORPAY_KEY_SECRET is not configured.")

    return razorpay.Client(
        auth=(key_id, key_secret)
    )