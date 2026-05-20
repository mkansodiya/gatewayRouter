import hashlib
import uuid
import urllib.parse
import requests
from typing import Dict, Any, Tuple, List
from app.providers.base import BasePaymentGateway

# LGPay API host is hardcoded (not configurable per documentation)
LGPAY_HOST = "https://www.lg-pay.com"
LGPAY_CREATE_URL = f"{LGPAY_HOST}/api/order/create"
LGPAY_QUERY_URL  = f"{LGPAY_HOST}/api/order/query"

# Fallback INR→BDT exchange rate (used when live fetch fails and no manual rate set)
EXCHANGE_RATE_FALLBACK = 1.4


class LGPayGateway(BasePaymentGateway):
    """
    LGPay Payment Gateway — Bangladesh (Nagad / bKash / INRUPI).

    Authentication: UPPERCASE MD5 signature.
    Sign string: http_build_query style (urllib.parse.urlencode + unquote) + &key=SECRET.

    Required config_data keys (sourced exclusively from the database):
        app_id        - LGPay merchant App ID
        key           - Merchant secret key for signature
        trade_type    - Payment method: INRUPI, Nagad, or bKash
        exchange_rate - INR→BDT rate (set to "1" for INRUPI / direct INR)
    """

    @property
    def id(self) -> str:
        return "lgpay"

    @property
    def name(self) -> str:
        return "LGPay"

    @property
    def credentials_schema(self) -> List[Dict[str, str]]:
        """
        Declares the 4 fields required to configure LGPay.
        All values at runtime come exclusively from the database config_data.
        """
        return [
            {
                "name":        "app_id",
                "label":       "App ID (Merchant Login)",
                "type":        "text",
                "placeholder": "e.g. YD5094",
            },
            {
                "name":        "key",
                "label":       "Merchant Key (MD5 Secret)",
                "type":        "password",
                "placeholder": "32+ character merchant secret",
            },
            {
                "name":        "trade_type",
                "label":       "Trade Type",
                "type":        "text",
                "placeholder": "INRUPI  |  Nagad  |  bKash",
            },
            {
                "name":        "exchange_rate",
                "label":       "Exchange Rate (INR → BDT)",
                "type":        "text",
                "placeholder": "1 for INRUPI/direct INR; 1.4 for BDT auto",
            },
        ]

    # ── Signature ─────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_sign(params: Dict[str, Any], key: str) -> str:
        """
        LGPay UPPERCASE MD5 signature algorithm:

        1. Drop 'sign' key and any empty/None values.
        2. Sort remaining keys alphabetically (ksort).
        3. Build query string via urllib.parse.urlencode (≡ PHP http_build_query).
        4. URL-decode the result (≡ PHP urldecode) — CRITICAL step.
        5. Trim and append &key=SECRET.
        6. MD5 → UPPERCASE.

        This differs from OkPay:
        - Uses urlencode+unquote instead of a manual 'key=val&' loop.
        - Result is UPPERCASE (OkPay is lowercase).
        """
        key = key.strip()

        # Remove 'sign' and empty values
        filtered = {
            k: str(v)
            for k, v in params.items()
            if k != "sign" and v is not None and str(v) != ""
        }

        # Sort alphabetically
        sorted_keys = sorted(filtered.keys())
        ordered = {k: filtered[k] for k in sorted_keys}

        # Build query string then URL-decode (matching PHP's http_build_query + urldecode)
        raw_query = urllib.parse.urlencode(ordered)
        decoded   = urllib.parse.unquote_plus(raw_query)      # urldecode equivalent (decodes + to space)
        sign_str  = decoded.strip() + f"&key={key}"

        print(f"LGPay Debug: signing string -> {sign_str}")
        return hashlib.md5(sign_str.encode("utf-8")).hexdigest().upper()  # UPPERCASE

    # ── Exchange rate helper ───────────────────────────────────────────────────

    @staticmethod
    def _resolve_exchange_rate(config_rate: str) -> float:
        """
        Exchange rate resolution priority (per documentation):
        1. Manual numeric rate from config_data (if > 0).
        2. Live fetch from open.er-api.com.
        3. Hardcoded fallback (1.4).
        """
        # 1. Manual rate from DB
        try:
            rate = float(config_rate)
            if rate > 0:
                return rate
        except (ValueError, TypeError):
            pass

        # 2. Live fetch
        try:
            resp = requests.get(
                "https://open.er-api.com/v6/latest/INR",
                timeout=5
            )
            data = resp.json()
            live = float(data["rates"]["BDT"])
            if live > 0:
                return live
        except Exception:
            pass

        # 3. Fallback
        return EXCHANGE_RATE_FALLBACK

    # ── Main entry point ───────────────────────────────────────────────────────

    def process_payment(
        self,
        amount: float,
        description: str,
        redirect_url: str,
        config: Dict[str, Any],
    ) -> Tuple[bool, str, str, str, str]:
        """
        Create a payment order via LGPay /api/order/create.

        Returns:
            (success, error_message, qr_string, payment_url, gateway_order_id)
        """
        app_id     = config.get("app_id", "").strip()
        key        = config.get("key", "").strip()
        trade_type = config.get("trade_type", "INRUPI").strip()
        notify_url = config.get("notify_url", "").strip()
        rate_cfg   = config.get("exchange_rate", "1")

        if not app_id:
            return False, "LGPay: app_id is not configured in the database.", "", "", ""
        if not key:
            return False, "LGPay: key (merchant key) is not configured in the database.", "", "", ""

        # ── Currency / Amount conversion ───────────────────────────────────────
        # For INRUPI: exchange_rate should be 1 (INR → INR×100 paise).
        # For Nagad/bKash: convert INR → BDT using exchange_rate, then ×100.
        exchange_rate = self._resolve_exchange_rate(str(rate_cfg))
        money = int(round(float(amount) * exchange_rate * 100))

        # ── Order serial number ───────────────────────────────────────────────
        # Format: GR- prefix + 16 uppercase hex chars (unique, traceable)
        order_sn = f"GR-{uuid.uuid4().hex[:16].upper()}"

        # Build the raw params dict; include only non-empty values so the POST body
        # exactly matches what gets signed. Sending empty fields causes a sign mismatch
        # because LGPay's server computes the sign over ALL received POST fields.
        raw_params: Dict[str, Any] = {
            "app_id":     app_id,
            "trade_type": trade_type,
            "order_sn":   order_sn,
            "money":      money,
            "ip":         "0.0.0.0",
        }
        # Only include optional fields when they actually have a value
        if notify_url:
            raw_params["notify_url"] = notify_url
        if description:
            raw_params["remark"] = description

        raw_params["sign"] = self._generate_sign(raw_params, key)

        # Stringify all values for form encoding
        post_data = {k: str(v) for k, v in raw_params.items()}

        try:
            resp = requests.post(
                LGPAY_CREATE_URL,
                data=post_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            print(f"LGPay Debug: response -> {result}")
        except requests.exceptions.Timeout:
            return False, "LGPay: Request timed out (30s).", "", "", ""
        except requests.exceptions.RequestException as exc:
            return False, f"LGPay: Network error — {exc}", "", "", ""
        except ValueError:
            return False, "LGPay: Invalid JSON response from gateway.", "", "", ""

        if result.get("status") != 1:
            msg = result.get("msg", "Unknown gateway error")
            return False, f"LGPay Error: {msg} (status={result.get('status')})", "", "", ""

        pay_url = result.get("data", {}).get("pay_url", "")
        if not pay_url:
            return False, "LGPay: pay_url not found in response data.", "", "", ""

        # LGPay returns a redirect URL only (no QR string).
        # Return order_sn as gateway_order_id for webhook matching.
        return True, "", "", pay_url, order_sn

    # ── Query helper (for polling / status checks) ────────────────────────────

    def query_payment(self, order_sn: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Query the payment status for a given order_sn.

        Returns the raw API response dict, or raises on network/parse errors.
        """
        app_id = config.get("app_id", "").strip()
        key    = config.get("key", "").strip()

        params = {"app_id": app_id, "order_sn": order_sn}
        params["sign"] = self._generate_sign(params, key)

        resp = requests.post(
            LGPAY_QUERY_URL,
            data=params,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
