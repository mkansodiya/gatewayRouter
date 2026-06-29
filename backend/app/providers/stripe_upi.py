import stripe
from typing import Dict, Any, Tuple, List
from app.providers.base import BasePaymentGateway
from app.utils.indian_data import generate_indian_billing_details


class StripeUPIGateway(BasePaymentGateway):
    """
    Stripe UPI QR Code payment gateway integration.

    Required config_data keys:
        stripe_secret_key      - Stripe Secret API Key (sk_test_... or sk_live_...)
        stripe_publishable_key - Stripe Publishable API Key (pk_test_... or pk_live_...)
    """

    @property
    def id(self) -> str:
        return "stripe-upi"

    @property
    def name(self) -> str:
        return "Stripe UPI"

    @property
    def credentials_schema(self) -> List[Dict[str, str]]:
        return [
            {
                "name": "stripe_secret_key",
                "label": "Stripe Secret Key",
                "type": "password",
                "placeholder": "sk_test_..."
            },
            {
                "name": "stripe_publishable_key",
                "label": "Stripe Publishable Key",
                "type": "text",
                "placeholder": "pk_test_..."
            }
        ]

    def _scan_qr_from_url(self, url: str) -> str:
        import urllib.request
        from PIL import Image
        from pyzbar.pyzbar import decode
        import io

        try:
            req = urllib.request.urlopen(url, timeout=10)
            img_bytes = req.read()
            img = Image.open(io.BytesIO(img_bytes))
            decoded_objects = decode(img)
            if decoded_objects:
                return decoded_objects[0].data.decode("utf-8")
        except Exception as e:
            print(f"Stripe UPI QR decoding error: {e}")
        return ""

    def process_payment(
        self,
        amount: float,
        description: str,
        redirect_url: str,
        config: Dict[str, Any],
    ) -> Tuple[bool, str, str, str, str]:
        """
        Create and confirm a UPI PaymentIntent using Stripe.
        Returns:
            (success, error_message, qr_string, payment_url, gateway_order_id)
        """
        secret_key = config.get("stripe_secret_key", "").strip()
        if not secret_key:
            return False, "Stripe UPI: Secret key not configured.", "", "", ""

        # Set the stripe api key
        stripe.api_key = secret_key

        # Stripe expects amount in paise (integer)
        amount_in_paise = int(round(float(amount) * 100))

        try:
            # 1. Create the PaymentIntent
            intent = stripe.PaymentIntent.create(
                amount=amount_in_paise,
                currency="inr",
                payment_method_types=["upi"],
                description=description or "Gateway Router payment",
            )

            # 2. Confirm the PaymentIntent with dynamic, realistic Indian billing details (required for UPI in India)
            billing_details = generate_indian_billing_details()
            confirmed_intent = stripe.PaymentIntent.confirm(
                intent.id,
                payment_method_data={
                    "type": "upi",
                    "billing_details": billing_details
                },
            )
        except stripe.error.StripeError as e:
            return False, f"Stripe UPI Error: {e.user_message or str(e)}", "", "", ""
        except Exception as e:
            return False, f"Stripe UPI Network/Unexpected Error: {str(e)}", "", "", ""

        # 3. Process Stripe next_action to obtain QR code asset
        if confirmed_intent.status == "requires_action" and confirmed_intent.next_action:
            if confirmed_intent.next_action.type == "upi_handle_redirect_or_display_qr_code":
                upi_data = confirmed_intent.next_action.upi_handle_redirect_or_display_qr_code
                qr_code_url = upi_data.qr_code.image_url_png or upi_data.qr_code.image_url_svg
                hosted_url = upi_data.hosted_instructions_url
                
                # Scan/decode the QR image to extract the raw UPI intent string (e.g. upi://pay?pa=...)
                qr_string = ""
                if qr_code_url:
                    qr_string = self._scan_qr_from_url(qr_code_url)
                
                # Fallback to the image url if scanning failed
                if not qr_string:
                    qr_string = qr_code_url
                
                return True, "", qr_string, hosted_url, confirmed_intent.id

        if confirmed_intent.status == "succeeded":
            return True, "", "", "", confirmed_intent.id

        return False, f"Stripe UPI: Unexpected payment status '{confirmed_intent.status}'", "", "", confirmed_intent.id

    def query_payment(self, gateway_order_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Query payment status from Stripe using retrieve.
        Returns:
            {"status": status_code, "data": data_dict}
        """
        secret_key = config.get("stripe_secret_key", "").strip()
        if not secret_key:
            return {"status": 0, "message": "Stripe UPI: Secret key not configured."}

        stripe.api_key = secret_key

        try:
            intent = stripe.PaymentIntent.retrieve(gateway_order_id)
            if intent.status == "succeeded":
                return {
                    "status": 1,
                    "data": {
                        "trade_no": None
                    }
                }
            elif intent.status in ("canceled", "failed"):
                return {"status": -1, "message": f"Stripe status: {intent.status}"}
            else:
                return {"status": 0, "message": f"Stripe status: {intent.status}"}
        except Exception as e:
            return {"status": 0, "message": f"Stripe retrieve error: {str(e)}"}
