from app.database import SessionLocal
from app.models import GatewayConfig
from app.registry import registry

db = SessionLocal()
config = db.query(GatewayConfig).filter(GatewayConfig.id == "paycrm").first().config_data
provider = registry.get("paycrm")

order_id = "6a1fdf5694160463"
utr = "12345678"

print("=== ACTIVATE DEPOSIT ===")
success, msg, data = provider.activate_deposit(order_id, utr, config)
print("Success:", success)
print("Message:", msg)
print("Data:", data)

print("\n=== CHECK STATUS ===")
success_s, msg_s, data_s = provider.check_status(order_id, config)
print("Success:", success_s)
print("Message:", msg_s)
print("Data:", data_s)
