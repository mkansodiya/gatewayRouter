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

    # ── Check Status API ───────────────────────────────────────────────────────

    CHECK_STATUS_URL = "https://secure-stage.imb.org.in/api/check-order-status"

    def check_payment_status(
        self,
        order_id: str,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Query the IMB Check Status API for a given order_id.

        URL: https://secure-stage.imb.org.in/api/check-order-status
        Method: POST (application/x-www-form-urlencoded)
        Params: user_token, order_id

        Returns a dict with:
            success  (bool)   - True if status is COMPLETED/SUCCESS
            status   (str)    - Raw status string from IMB ("COMPLETED", "ERROR", etc.)
            utr      (str)    - UTR from result if available, else ""
            message  (str)    - Human-readable message
            raw      (dict)   - Full parsed response from IMB

        Errors are surfaced via 'success=False' and 'message' — never raised.
        """
        api_key  = config.get("api_key", "").strip()
        order_id = str(order_id).strip()

        if not api_key:
            return {
                "success": False,
                "status": "ERROR",
                "utr": "",
                "message": "IMB: api_key is not configured in the database.",
                "raw": {},
            }
        if not order_id:
            return {
                "success": False,
                "status": "ERROR",
                "utr": "",
                "message": "IMB: order_id is required.",
                "raw": {},
            }

        payload = {
            "user_token": api_key,
            "order_id":   order_id,
        }

        try:
            resp = requests.post(
                self.CHECK_STATUS_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "status": "ERROR",
                "utr": "",
                "message": "IMB check-status: Request timed out (30s).",
                "raw": {},
            }
        except requests.exceptions.RequestException as exc:
            return {
                "success": False,
                "status": "ERROR",
                "utr": "",
                "message": f"IMB check-status: Network error — {exc}",
                "raw": {},
            }
        except ValueError:
            return {
                "success": False,
                "status": "ERROR",
                "utr": "",
                "message": "IMB check-status: Invalid JSON response from gateway.",
                "raw": {},
            }

        if not isinstance(result, dict):
            return {
                "success": False,
                "status": "ERROR",
                "utr": "",
                "message": "IMB check-status: Unexpected response format.",
                "raw": {},
            }

        top_status = str(result.get("status", "")).upper()
        message    = result.get("message", "")
        inner      = result.get("result", {}) if isinstance(result.get("result"), dict) else {}

        # Success: top-level status is COMPLETED and inner result.status is SUCCESS
        is_success = (top_status == "COMPLETED" and
                      str(inner.get("status", "")).upper() == "SUCCESS")

        utr = str(inner.get("utr", "")).strip()

        return {
            "success": is_success,
            "status":  top_status,
            "utr":     utr,
            "message": message,
            "raw":     result,
        }

    @staticmethod
    def generate_order_id() -> str:
        """10-digit numeric order ID matching IMB plugin's format."""
        return str(uuid.uuid4().int)[:10]
