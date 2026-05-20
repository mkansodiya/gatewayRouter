import hashlib
import uuid
import requests
from typing import Dict, Any, Tuple, List
from app.providers.base import BasePaymentGateway


class JazPaysGateway(BasePaymentGateway):
    """
    JazPays Payment Gateway.

    Authentication: MD5 signature.
    Required config_data keys (from database):
        merchant_id   - Unique merchant identifier
        api_key       - Secret API key
        notify_url    - Webhook callback URL (sent as callback_url)
    """

    @property
    def id(self) -> str:
        return "jazpays"

    @property
    def name(self) -> str:
        return "JazPays"

    @property
    def credentials_schema(self) -> List[Dict[str, str]]:
        return [
            {
                "name":        "merchant_id",
                "label":       "Merchant ID",
                "type":        "text",
                "placeholder": "Your JazPays merchant ID",
            },
            {
                "name":        "api_key",
                "label":       "API Key",
                "type":        "password",
                "placeholder": "Your JazPays secret API Key",
            },
            {
                "name":        "notify_url",
                "label":       "Webhook callback URL",
                "type":        "url",
                "placeholder": "https://your-domain.com/api/webhooks/jazpays",
            },
        ]

    @staticmethod
    def _generate_sign(params: Dict[str, str], api_key: str) -> str:
        """
        JazPays signature generation:
        1. Prepare dataset: merchant_id, amount, merchant_order_no, callback_url.
        2. Sort alphabetically by key (Ascending).
        3. Build string by concatenating with & (field=value) with a trailing &.
        4. Append key=api_key.
        5. MD5 hash.
        """
        # Ensure only the 4 required parameters are in the dataset
        sign_params = {
            "merchant_id": params.get("merchant_id", ""),
            "amount": params.get("amount", ""),
            "merchant_order_no": params.get("merchant_order_no", ""),
            "callback_url": params.get("callback_url", ""),
        }

        # Sort alphabetically by key
        sorted_keys = sorted(sign_params.keys())

        # Concatenate using & (field=value) with a trailing &
        sign_parts = [f"{k}={sign_params[k]}" for k in sorted_keys]
        sign_str = "&".join(sign_parts) + "&"

        # Append api_key secret
        sign_str += f"key={api_key}"

        print(f"JazPays Debug: signing string -> {sign_str}")
        return hashlib.md5(sign_str.encode("utf-8")).hexdigest().lower()

    @classmethod
    def verify_webhook_signature(cls, data: Dict[str, Any], api_key: str) -> bool:
        """
        Verify the signature of the incoming webhook notification.
        Payload parameters: orderNo, merchantOrder, status, amount.
        We sort these alphabetically and generate MD5 hash.
        Since float/integer representation of amount might vary, we generate
        multiple candidates (e.g. raw, integer, 2-decimal places) and check if
        any match.
        """
        incoming_sign = data.get("signature", "").strip().lower()
        if not incoming_sign:
            return False

        # Gather parameters excluding 'signature'
        sign_params = {k: v for k, v in data.items() if k != "signature"}

        # Generate candidates for amount representation
        amount_raw = sign_params.get("amount")
        amount_candidates = []
        if amount_raw is not None:
            amount_candidates.append(str(amount_raw))
            try:
                amount_float = float(amount_raw)
                amount_candidates.append(f"{amount_float:.2f}")
                amount_candidates.append(str(int(amount_float)))
            except (ValueError, TypeError):
                pass
        else:
            amount_candidates.append("")

        # Try signing with each amount candidate
        for amt_str in amount_candidates:
            params_to_sign = dict(sign_params)
            params_to_sign["amount"] = amt_str

            # Sort alphabetically by key
            sorted_keys = sorted(params_to_sign.keys())

            # Candidate 1: with trailing ampersand before api_key (e.g. k1=v1&k2=v2&key=secret)
            sign_parts = [f"{k}={params_to_sign[k]}" for k in sorted_keys]
            sign_str_1 = "&".join(sign_parts) + f"&key={api_key}"
            sign_1 = hashlib.md5(sign_str_1.encode("utf-8")).hexdigest().lower()

            # Candidate 2: with trailing ampersand in loop (e.g. k1=v1&k2=v2&&key=secret -> wait, in PHP: foreach $params: $signStr .= $k."=".$v."&"; so it is: k1=v1&k2=v2&key=secret)
            # Actually, standard foreach appends & to the last element, resulting in k1=v1&k2=v2&key=secret.
            # If they didn't have a trailing ampersand in loop, they might do key=secret without & (k1=v1&k2=v2key=secret)
            sign_str_2 = "&".join(sign_parts) + f"key={api_key}"
            sign_2 = hashlib.md5(sign_str_2.encode("utf-8")).hexdigest().lower()

            # Compare with incoming signature
            if incoming_sign in (sign_1, sign_2):
                print(f"JazPays Debug: webhook signature verified using amount candidate: {amt_str}")
                return True

        print(f"JazPays Debug: webhook signature verification failed for incoming signature: {incoming_sign}")
        return False

    def process_payment(
        self,
        amount: float,
        description: str,
        redirect_url: str,
        config: Dict[str, Any],
    ) -> Tuple[bool, str, str, str, str]:
        """
        Create a payment order via JazPays /v1/create.

        Returns:
            (success, error_message, qr_string, payment_url, gateway_order_id)
        """
        merchant_id = config.get("merchant_id", "").strip()
        api_key = config.get("api_key", "").strip()
        notify_url = config.get("notify_url", "").strip()

        if not merchant_id:
            return False, "JazPays: merchant_id is not configured in the database.", "", "", ""
        if not api_key:
            return False, "JazPays: api_key is not configured in the database.", "", "", ""

        # Format amount as a string with two decimal places (e.g. 1000.00)
        amount_str = f"{amount:.2f}"

        # Unique merchant order serial number
        merchant_order_no = f"ORD{uuid.uuid4().hex[:12].upper()}"

        params = {
            "merchant_id": merchant_id,
            "amount": amount_str,
            "merchant_order_no": merchant_order_no,
            "callback_url": notify_url,
        }

        signature = self._generate_sign(params, api_key)

        # Build JSON body
        payload = {
            "merchant_id": merchant_id,
            "amount": amount_str,
            "merchant_order_no": merchant_order_no,
            "callback_url": notify_url,
            "api_key": api_key,
            "signature": signature,
        }

        try:
            resp = requests.post(
                "https://api.jazpays.com/v1/create",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
            print(f"JazPays Debug: request payload -> {payload}")
            print(f"JazPays Debug: raw response status -> {resp.status_code}")
            
            # Note: since the API might be mocked or we want to inspect response
            resp.raise_for_status()
            result = resp.json()
            print(f"JazPays Debug: response JSON -> {result}")
        except requests.exceptions.Timeout:
            return False, "JazPays: Request timed out (30s).", "", "", ""
        except requests.exceptions.RequestException as exc:
            # Let's inspect the response body if possible for debugging
            err_msg = f"JazPays: Network error — {exc}"
            if 'resp' in locals() and resp is not None:
                err_msg += f" (Body: {resp.text})"
            return False, err_msg, "", "", ""
        except ValueError:
            return False, "JazPays: Invalid JSON response from gateway.", "", "", ""

        # Parse success response
        # We look for a payment URL in various possible fields dynamically
        data = result.get("data", {}) if isinstance(result.get("data"), dict) else {}
        
        payment_url = (
            result.get("payment_url")
            or result.get("pay_url")
            or result.get("url")
            or result.get("paymentUrl")
            or data.get("payment_url")
            or data.get("pay_url")
            or data.get("url")
            or data.get("paymentUrl")
            or ""
        )

        if not payment_url:
            msg = result.get("message") or result.get("msg") or "payment URL not found in response"
            return False, f"JazPays Error: {msg}", "", "", ""

        # Return merchant_order_no as the gateway_order_id for webhook matching
        return True, "", "", payment_url, merchant_order_no
