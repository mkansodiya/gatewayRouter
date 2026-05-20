import os
import importlib
import inspect
from typing import Dict
from app.providers.base import BasePaymentGateway

class GatewayRegistry:
    def __init__(self):
        self._gateways: Dict[str, BasePaymentGateway] = {}
        # We will trigger discovery manually or during initialization.
        # But wait, let's trigger it inside discover_and_register.
        self.discover_and_register()

    def register(self, gateway: BasePaymentGateway):
        self._gateways[gateway.id] = gateway
        print(f"Registered payment gateway: {gateway.name} ({gateway.id})")

    def get(self, gateway_id: str) -> BasePaymentGateway:
        return self._gateways.get(gateway_id)

    def get_all(self) -> Dict[str, BasePaymentGateway]:
        return self._gateways

    def discover_and_register(self):
        # Scan the app/providers directory
        providers_dir = os.path.join(os.path.dirname(__file__), "providers")
        if not os.path.exists(providers_dir):
            print(f"Providers directory not found at {providers_dir}")
            return

        for filename in os.listdir(providers_dir):
            if filename.endswith(".py") and filename not in ("__init__.py", "base.py"):
                module_name = f"app.providers.{filename[:-3]}"
                try:
                    # Dynamically import the python file
                    module = importlib.import_module(module_name)
                    # Inspect all classes in the module
                    for _, obj in inspect.getmembers(module, inspect.isclass):
                        if issubclass(obj, BasePaymentGateway) and obj is not BasePaymentGateway:
                            # Instantiate the class and register
                            gateway_instance = obj()
                            self.register(gateway_instance)
                except Exception as e:
                    print(f"Failed to dynamically load provider module {module_name}: {e}")

# Global registry instance
registry = GatewayRegistry()
