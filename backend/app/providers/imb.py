import uuid
import requests
from typing import Dict, Any, Tuple, List
from app.providers.base import BasePaymentGateway


class IMBGateway(BasePaymentGateway):
    """
    IMB UPI Payment Gateway integration.

    Authentication: Simple bearer token (user_token) — no signature required.

    Required config_data keys (sourced exclusively from DB):
        api_key  - Your IMB API Key / user_token
        host_url - Full endpoint URL for creating payment sessions
    """

    @property
    def id(self) -> str:
        return "imb"

    @property
    def name(self) -> str:
        return "IMB"

    @property
    def credentials_schema(self) -> List[Dict[str, str]]:
        """
        Declares the 2 required credential fields for IMB.
        All values at runtime come exclusively from the database config_data.
        """
        return [
            {
                "name":        "api_key",
                "label":       "API Key (user_token)",
                "type":        "password",
                "placeholder": "Your IMB secret API token",
            },
            {
                "name":        "host_url",
                "label":       "Host URL",
                "type":        "url",
                "placeholder": "https://your-imb-host-url.com/create-order",
            },
        ]

    # ── Main entry point ───────────────────────────────────────────────────────

    def process_payment(
        self,
        amount: float,
        description: str,
        redirect_url: str,
        config: Dict[str, Any],
    ) -> Tuple[bool, str, str, str]:
        """
        Create a payment order via the IMB API.

        Returns:
            (success, error_message, qr_string, payment_url)

        Note:
            - IMB returns a `payment_url` only (no QR string). The user is
              redirected to that URL to complete their UPI payment.
            - There is NO signature/sign field required; auth is via user_token.
        """
        api_key  = config.get("api_key", "").strip()
        host_url = config.get("host_url", "").strip().rstrip("/")

        if not api_key:
            return False, "IMB: api_key is not configured in the database.", "", "", ""
        if not host_url:
            return False, "IMB: host_url is not configured in the database.", "", "", ""

        # Generate a 10-digit numeric order ID matching IMB's expected format
        # (mirrors the plugin's microtime+rand approach using uuid for uniqueness)
        order_id = str(uuid.uuid4().int)[:10]

        payload = {
            "user_token":   api_key,
            "amount":       str(amount),
            "order_id":     order_id,
            "redirect_url": redirect_url or "",
        }

        try:
            resp = requests.post(
                host_url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
        except requests.exceptions.Timeout:
            return False, "IMB: Request timed out (30s).", "", "", ""
        except requests.exceptions.RequestException as exc:
            return False, f"IMB: Network error — {exc}", "", "", ""
        except ValueError:
            return False, "IMB: Invalid JSON response from gateway.", "", "", ""

        # Validate response per the plugin's documented validation rules
        if not isinstance(result, dict):
            return False, "IMB: Invalid response format (expected JSON object).", "", "", ""
        if "status" not in result or "result" not in result:
            return False, "IMB: Invalid response from IMB — missing status or result keys.", "", "", ""
        if result.get("status") is not True:
            msg = result.get("message", "Unknown error")
            return False, f"IMB Error: {msg}", "", "", ""

        payment_url = result.get("result", {}).get("payment_url", "")
        if not payment_url:
            return False, "IMB: Invalid response — payment_url not found in data.", "", "", ""

        # IMB returns a redirect URL only (no QR string).
        # Return order_id as gateway_order_id so the webhook can match by it.
        return True, "", "", payment_url, order_id

    @staticmethod
    def generate_order_id() -> str:
        """10-digit numeric order ID matching IMB plugin's format."""
        return str(uuid.uuid4().int)[:10]
