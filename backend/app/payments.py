import os
import uuid

import razorpay
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.email import send_payment_confirmation_email
from app.supabase_client import get_supabase


router = APIRouter()


# ============================================================
# CREDIT PACKAGES
# ============================================================

CREDIT_PACKAGES = {
    "starter": {
        "name": "Starter",
        "credits": 50,
        "price": 99,
        "description": "For occasional research",
    },
    "popular": {
        "name": "Researcher",
        "credits": 120,
        "price": 199,
        "description": "For regular research",
    },
    "pro": {
        "name": "Power",
        "credits": 300,
        "price": 449,
        "description": "For heavy research usage",
    },
}


# ============================================================
# RAZORPAY CLIENT
# ============================================================

def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay credentials are not configured.",
        )

    return razorpay.Client(
        auth=(key_id, key_secret)
    )


# ============================================================
# REQUEST MODELS
# ============================================================

class CreateOrderRequest(BaseModel):
    package_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ============================================================
# CREATE RAZORPAY ORDER
# ============================================================

@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    user=Depends(get_current_user),
):
    package = CREDIT_PACKAGES.get(request.package_id)

    if not package:
        raise HTTPException(
            status_code=400,
            detail="Invalid credit package.",
        )

    amount_paise = package["price"] * 100

    razorpay_client = get_razorpay_client()

    receipt = f"rp_{uuid.uuid4().hex[:20]}"

    # --------------------------------------------------------
    # Create Razorpay order
    # --------------------------------------------------------

    try:
        order = razorpay_client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "user_id": user.id,
                    "package_id": request.package_id,
                },
            }
        )

    except Exception as error:
        print(
            "RAZORPAY ORDER CREATION ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create Razorpay order.",
        ) from error

    # --------------------------------------------------------
    # Save purchase in Supabase
    # --------------------------------------------------------

    supabase = get_supabase()

    try:
        supabase.table("credit_purchases").insert(
            {
                "user_id": user.id,
                "package_name": package["name"],
                "credits": package["credits"],
                "amount": amount_paise,
                "currency": "INR",
                "razorpay_order_id": order["id"],
                "status": "created",
            }
        ).execute()

    except Exception as error:
        print(
            "CREDIT PURCHASE INSERT ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Order created but purchase could not be saved."
            ),
        ) from error

    # --------------------------------------------------------
    # Send order details to frontend
    # --------------------------------------------------------

    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": os.getenv("RAZORPAY_KEY_ID"),
        "package_id": request.package_id,
        "package_name": package["name"],
        "credits": package["credits"],
        "email": user.email,
    }


# ============================================================
# VERIFY PAYMENT
# ============================================================

@router.post("/verify")
def verify_payment(
    request: VerifyPaymentRequest,
    user=Depends(get_current_user),
):
    razorpay_client = get_razorpay_client()
    supabase = get_supabase()

    # --------------------------------------------------------
    # STEP 1: Verify Razorpay signature
    # --------------------------------------------------------

    try:
        razorpay_client.utility.verify_payment_signature(
            {
                "razorpay_order_id":
                    request.razorpay_order_id,

                "razorpay_payment_id":
                    request.razorpay_payment_id,

                "razorpay_signature":
                    request.razorpay_signature,
            }
        )

    except Exception as error:
        print(
            "RAZORPAY SIGNATURE VERIFICATION ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=400,
            detail="Payment verification failed.",
        ) from error

    # --------------------------------------------------------
    # STEP 2: Find purchase record
    # --------------------------------------------------------

    try:
        transaction_response = (
            supabase
            .table("credit_purchases")
            .select("*")
            .eq(
                "razorpay_order_id",
                request.razorpay_order_id,
            )
            .eq(
                "user_id",
                user.id,
            )
            .maybe_single()
            .execute()
        )

    except Exception as error:
        print(
            "PAYMENT TRANSACTION LOOKUP ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to find payment transaction.",
        ) from error

    transaction = transaction_response.data

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Payment transaction not found.",
        )

    # --------------------------------------------------------
    # STEP 3: Prevent duplicate processing
    # --------------------------------------------------------

    if transaction["status"] == "paid":
        return {
            "success": True,
            "already_processed": True,
            "credits": transaction["credits"],
            "payment_id": transaction.get(
                "razorpay_payment_id"
            ),
            "order_id": request.razorpay_order_id,
        }

    # --------------------------------------------------------
    # STEP 4: Mark payment as paid
    # --------------------------------------------------------

    try:
        update_response = (
            supabase
            .table("credit_purchases")
            .update(
                {
                    "razorpay_payment_id":
                        request.razorpay_payment_id,

                    "razorpay_signature":
                        request.razorpay_signature,

                    "status": "paid",
                }
            )
            .eq(
                "id",
                transaction["id"],
            )
            .eq(
                "status",
                "created",
            )
            .execute()
        )

    except Exception as error:
        print(
            "PAYMENT UPDATE ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update payment transaction.",
        ) from error

    # --------------------------------------------------------
    # STEP 5: Handle race condition / duplicate request
    # --------------------------------------------------------

    if not update_response.data:
        return {
            "success": True,
            "already_processed": True,
            "credits": transaction["credits"],
            "payment_id":
                request.razorpay_payment_id,
            "order_id":
                request.razorpay_order_id,
        }

    # --------------------------------------------------------
    # STEP 6: Add credits to user
    # --------------------------------------------------------

    try:
        credit_response = (
            supabase
            .rpc(
                "add_credits",
                {
                    "p_user_id": user.id,
                    "p_credits": transaction["credits"],
                },
            )
            .execute()
        )

        if credit_response.data is False:
            raise RuntimeError(
                "add_credits RPC returned false."
            )

    except Exception as error:
        print(
            "ADD CREDITS ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Payment was verified, but credits could "
                "not be added. Please contact support."
            ),
        ) from error

    # --------------------------------------------------------
    # STEP 7: Send payment confirmation email
    # --------------------------------------------------------

    email_sent = False

    if user.email:
        try:
            send_payment_confirmation_email(
                to_email=user.email,

                package_name=
                    transaction["package_name"],

                credits=
                    transaction["credits"],

                amount_paise=
                    transaction["amount"],

                payment_id=
                    request.razorpay_payment_id,

                order_id=
                    request.razorpay_order_id,
            )

            email_sent = True

        except Exception as error:
            # Email failure should NOT undo
            # an already successful payment.

            print(
                "PAYMENT CONFIRMATION EMAIL ERROR:",
                repr(error),
            )

    # --------------------------------------------------------
    # STEP 8: Final response
    # --------------------------------------------------------

    return {
        "success": True,
        "already_processed": False,
        "credits_added": transaction["credits"],
        "payment_id":
            request.razorpay_payment_id,
        "order_id":
            request.razorpay_order_id,
        "email_sent": email_sent,
    }