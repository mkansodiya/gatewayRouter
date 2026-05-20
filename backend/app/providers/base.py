from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, List

class BasePaymentGateway(ABC):
    """
    Abstract Base Class for all Payment Gateways.
    To integrate a new provider:
    1. Create a new file in `app/providers/` (e.g., `app/providers/my_new_gateway.py`).
    2. Subclass `BasePaymentGateway`.
    3. Implement `id`, `name`, `credentials_schema`, and `process_payment`.
    The dynamic registry will automatically discover and load the new gateway.
    """

    @property
    @abstractmethod
    def id(self) -> str:
        """
        Unique identifier for the payment gateway (e.g., 'okpay').
        Should match the file name and DB identifier.
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Human-readable name of the payment gateway (e.g., 'OkPay').
        """
        pass

    @property
    @abstractmethod
    def credentials_schema(self) -> List[Dict[str, str]]:
        """
        Declares the credential fields this gateway requires.
        Used to dynamically render the configuration form on the frontend.

        Each item in the list is a dict with:
            - name:        The key name used in config_data (e.g., 'api_key')
            - label:       Human-readable field label shown in the UI
            - type:        HTML input type — 'text', 'password', or 'url'
            - placeholder: (Optional) Example or hint text for the input field

        Example:
            [
                {"name": "api_key", "label": "API Key", "type": "password", "placeholder": "sk_live_..."},
                {"name": "webhook_secret", "label": "Webhook Secret", "type": "password", "placeholder": "whsec_..."},
            ]

        The `config_data` stored in the database will ALWAYS be the source of credentials
        at runtime. Never hardcode credentials in provider code.
        """
        pass

    @abstractmethod
    def process_payment(self, amount: float, description: str, redirect_url: str, config: Dict[str, Any]) -> Tuple[bool, str, str, str, str]:
        """
        Process a payment order transaction.

        Args:
            amount:       The transaction amount.
            description:  The order description.
            redirect_url: Redirect URL for callback after checkout.
            config:       Live credentials dict from the database (config_data column).
                          This is the ONLY source of truth for API keys and secrets.

        Returns:
            Tuple[bool, str, str, str, str]:
                (success, error_message, qr_string, payment_url, gateway_order_id)

            gateway_order_id: The order/reference ID sent to the payment provider
                (e.g., OkPay's out_trade_no, IMB's order_id). Stored as
                `reference_id` in the Transaction row so the webhook handler
                can look the transaction up when the callback arrives.
                Return an empty string if not applicable.
        """
        pass
