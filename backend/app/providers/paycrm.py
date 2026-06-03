import uuid
import requests
from typing import Dict, Any, Tuple, List
from app.providers.base import BasePaymentGateway


class PayCrmGateway(BasePaymentGateway):
    """
    Integration for Pay-CRM — Headless Deposit API (Native Integration).
    
    Required config_data keys:
        project_id - The project ID for authentication
        apikey     - The API key for authentication header
        host       - API host (default: https://pay-crm.com)
    """

    @property
    def id(self) -> str:
        return "paycrm"

    @property
    def name(self) -> str:
        return "Pay-CRM"

    @property
    def credentials_schema(self) -> List[Dict[str, str]]:
        return [
            {
                "name":        "project_id",
                "label":       "Project ID",
                "type":        "text",
                "placeholder": "e.g. 6515219"
            },
            {
                "name":        "apikey",
                "label":       "API Key",
                "type":        "password",
                "placeholder": "e.g. d4f98943ccdde024d253d14dd3c54261"
            },
            {
                "name":        "host",
                "label":       "API Host URL",
                "type":        "url",
                "placeholder": "https://pay-crm.com"
            },
        ]

    def process_payment(
        self,
        amount: float,
        description: str,
        redirect_url: str,
        config: Dict[str, Any],
    ) -> Tuple[bool, str, str, str, str]:
        """
        Create a headless deposit via Pay-CRM.
        Returns: (success, error_message, qr_string, payment_url, gateway_order_id)
        """
        project_id = config.get("project_id", "")
        apikey = config.get("apikey", "")
        host = config.get("host", "https://pay-crm.com").rstrip("/")

        if not project_id or not apikey:
            return False, "Pay-CRM: project_id or apikey not configured.", "", "", ""

        endpoint = f"{host}/Remotes/create-deposit"
        custom_transaction_id = f"GR-{uuid.uuid4().hex[:16].upper()}"
        custom_user_id = "USER_ID_1" # Based on doc, can be static or generated

        payload = {
            "amount": str(int(amount)),
            "currency": "INR",
            "payment_system": "upi_p2p",
            "data": {},
            "custom_transaction_id": custom_transaction_id,
            "custom_user_id": custom_user_id,
            "return_url": redirect_url or ""
        }

        headers = {
            "Content-Type": "application/json",
            "apikey": apikey
        }

        try:
            resp = requests.post(
                endpoint,
                params={"project_id": project_id},
                json=payload,
                headers=headers,
                timeout=30,
            )
            
            if not resp.ok:
                try:
                    err_json = resp.json()
                    msg = err_json.get("message", resp.text)
                    return False, f"Pay-CRM Error: {msg}", "", "", ""
                except ValueError:
                    return False, f"Pay-CRM Error {resp.status_code}: {resp.text}", "", "", ""
                    
            result = resp.json()
        except requests.exceptions.Timeout:
            return False, "Pay-CRM: Request timed out (30s).", "", "", ""
        except requests.exceptions.RequestException as exc:
            return False, f"Pay-CRM: Network error — {exc}", "", "", ""
        except ValueError:
            return False, "Pay-CRM: Invalid JSON response from gateway.", "", "", ""

        if not result.get("success"):
            msg = result.get("message", "Unknown error")
            return False, f"Pay-CRM Error: {msg}", "", "", ""

        order_id = result.get("order_id", "")
        data = result.get("data", {})
        qr_string = data.get("paymentpage_url", "")
        payment_url = qr_string # Since headless deposit gives deep link

        return True, "", qr_string, payment_url, order_id

    def activate_deposit(self, order_id: str, utr: str, config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Verify/activate a deposit using the Deposit Activation API.
        This is called to check if the payment paid on the QR has been activated.
        """
        project_id = config.get("project_id", "")
        apikey = config.get("apikey", "")
        host = config.get("host", "https://pay-crm.com").rstrip("/")

        if not project_id or not apikey:
            return False, "Pay-CRM: project_id or apikey not configured.", {}

        endpoint = f"{host}/Remotes/deposit-activate"
        params = {
            "project_id": project_id,
            "order_id": order_id
        }
        
        payload = {
            "payment_system": "upi_p2p",
            "data": {
                "key": utr
            }
        }

        headers = {
            "Content-Type": "application/json",
            "apikey": apikey
        }

        try:
            resp = requests.post(
                endpoint,
                params=params,
                json=payload,
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            return True, "", result
        except requests.exceptions.Timeout:
            return False, "Request timed out (30s).", {}
        except requests.exceptions.RequestException as exc:
            return False, f"Network error — {exc}", {}
        except ValueError:
            return False, "Invalid JSON response from gateway.", {}

    def check_status(self, order_id: str, config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Check the status of a deposit using the Deposit Info API.
        """
        project_id = config.get("project_id", "")
        apikey = config.get("apikey", "")
        host = config.get("host", "https://pay-crm.com").rstrip("/")

        if not project_id or not apikey:
            return False, "Pay-CRM: project_id or apikey not configured.", {}

        endpoint = f"{host}/Remotes/deposit-info"
        params = {
            "project_id": project_id,
            "order_id": order_id
        }
        
        headers = {
            "apikey": apikey
        }

        try:
            resp = requests.get(
                endpoint,
                params=params,
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            return True, "", result
        except requests.exceptions.Timeout:
            return False, "Request timed out (30s).", {}
        except requests.exceptions.RequestException as exc:
            return False, f"Network error — {exc}", {}
        except ValueError:
            return False, "Invalid JSON response from gateway.", {}
