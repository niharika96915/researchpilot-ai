import os
from pathlib import Path

import resend
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(
    dotenv_path=ENV_FILE,
    override=True,
)


# ============================================================
# PAYMENT CONFIRMATION EMAIL
# ============================================================

def send_payment_confirmation_email(
    to_email: str,
    package_name: str,
    credits: int,
    amount_paise: int,
    payment_id: str,
    order_id: str,
):
    api_key = os.getenv("RESEND_API_KEY")

    from_email = os.getenv(
        "RESEND_FROM_EMAIL",
        "onboarding@resend.dev",
    )

    if not api_key:
        raise RuntimeError(
            "RESEND_API_KEY is not configured."
        )

    resend.api_key = api_key

    amount_rupees = amount_paise / 100

    params = {
        "from":
            f"ResearchPilot AI <{from_email}>",

        "to":
            [to_email],

        "subject":
            "Payment successful — ResearchPilot AI",

        "html":
            f"""
            <div style="
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: auto;
                padding: 24px;
                color: #111827;
            ">

                <h2 style="
                    margin-bottom: 8px;
                ">
                    Payment successful 🎉
                </h2>

                <p>
                    Your payment for
                    <strong>ResearchPilot AI</strong>
                    was successfully verified.
                </p>

                <div style="
                    background: #f6f7f9;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                ">

                    <p>
                        <strong>Package:</strong>
                        {package_name}
                    </p>

                    <p>
                        <strong>Credits added:</strong>
                        {credits}
                    </p>

                    <p>
                        <strong>Amount:</strong>
                        ₹{amount_rupees:.2f}
                    </p>

                    <p>
                        <strong>Payment ID:</strong>
                        {payment_id}
                    </p>

                    <p>
                        <strong>Order ID:</strong>
                        {order_id}
                    </p>

                </div>

                <p>
                    Your credits have been added to
                    your ResearchPilot AI account.
                </p>

                <p style="
                    color: #666;
                    margin-top: 24px;
                ">
                    Thank you for using ResearchPilot AI.
                </p>

            </div>
            """,
    }

    return resend.Emails.send(params)