import hashlib
import uuid
import requests
from typing import Dict, Any, Tuple, List
from app.providers.base import BasePaymentGateway


class OkPayGateway(BasePaymentGateway):
    """
    Real integration for OkPay (wpay.one) — UPI/QR payment gateway.

    Required config_data keys:
        mch_id    - Merchant ID issued by OkPay
        key       - MD5 signing secret
        host      - API host (e.g. https://sandbox.wpay.one)
        notify_url - Webhook callback URL your server exposes
    """

    @property
    def id(self) -> str:
        return "okpay"

    @property
    def name(self) -> str:
        return "OkPay"

    @property
    def credentials_schema(self) -> List[Dict[str, str]]:
        """
        Declares the 4 fields required to configure OkPay.
        All values at runtime come exclusively from the database config_data.
        """
        return [
            {
                "name":        "mch_id",
                "label":       "Merchant ID",
                "type":        "text",
                "placeholder": "e.g. 1000"
            },
            {
                "name":        "key",
                "label":       "MD5 Secret Key",
                "type":        "password",
                "placeholder": "32-character MD5 secret"
            },
            {
                "name":        "host",
                "label":       "API Host URL",
                "type":        "url",
                "placeholder": "https://sandbox.wpay.one"
            },
            {
                "name":        "notify_url",
                "label":       "Webhook Notification URL",
                "type":        "url",
                "placeholder": "https://your-domain.com/api/webhooks/okpay"
            },
        ]

    # ── Signature ─────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_sign(params: Dict[str, str], key: str) -> str:
        """
        OkPay MD5 signature algorithm:
        1. Drop 'sign' key and any empty/None values.
        2. Sort remaining keys alphabetically.
        3. Build key=val&key=val string.
        4. Append &key=SECRET.
        5. MD5 → lowercase.
        """
        filtered = {
            k: str(v)
            for k, v in params.items()
            if k != "sign" and v is not None and str(v) != ""
        }
        sorted_keys = sorted(filtered.keys())
        parts = [f"{k}={filtered[k]}" for k in sorted_keys]
        raw = "&".join(parts) + f"&key={key}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest().lower()

    # ── Main entry point ───────────────────────────────────────────────────────

    def process_payment(
        self,
        amount: float,
        description: str,
        redirect_url: str,
        config: Dict[str, Any],
    ) -> Tuple[bool, str, str, str]:
        """
        Create a payment order via OkPay /v1/Collect.

        Returns:
            (success, error_message, qr_string, payment_url)
        """
        mch_id = config.get("mch_id", "")
        key = config.get("key", "")
        host = config.get("host", "https://sandbox.wpay.one").rstrip("/")
        notify_url = config.get("notify_url", "")

        if not mch_id or not key:
            return False, "OkPay: mch_id or key not configured.", "", "", ""

        # OkPay expects amount as whole-number INR string (no decimals)
        money_int = str(int(round(float(amount))))
        out_trade_no = f"GR-{uuid.uuid4().hex[:16].upper()}"

        params: Dict[str, str] = {
            "mchId": str(mch_id),
            "out_trade_no": out_trade_no,
            "money": money_int,
            "currency": "INR",
            "pay_type": "UPI",
            "notify_url": notify_url,
            "returnUrl": redirect_url or "",
            "attach": description or "",
        }
        params["sign"] = self._generate_sign(params, key)

        try:
            resp = requests.post(
                f"{host}/v1/Collect",
                data=params,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
        except requests.exceptions.Timeout:
            return False, "OkPay: Request timed out (30s).", "", "", ""
        except requests.exceptions.RequestException as exc:
            return False, f"OkPay: Network error — {exc}", "", "", ""
        except ValueError:
            return False, "OkPay: Invalid JSON response from gateway.", "", "", ""

        if result.get("code") != 0:
            msg = result.get("msg", "Unknown gateway error")
            return False, f"OkPay Error: {msg} (code={result.get('code')})", "", "", ""

        data = result.get("data", {})
        payment_url = data.get("url", "")
        transaction_id = data.get("transaction_Id", out_trade_no)

        # Return out_trade_no as gateway_order_id so the webhook can match by it
        return True, "", "", payment_url, out_trade_no
