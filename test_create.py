from app.database import SessionLocal
from app.models import GatewayConfig
from app.registry import registry

db = SessionLocal()
config = db.query(GatewayConfig).filter(GatewayConfig.id == "paycrm").first().config_data
provider = registry.get("paycrm")

success, msg, qr, url, oid = provider.process_payment(500.0, "Test", "http://localhost:5173", config)
print("Success:", success)
print("Message:", msg)
