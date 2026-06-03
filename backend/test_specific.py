from app.database import SessionLocal
from app.models import GatewayConfig, Transaction
from app.registry import registry

db = SessionLocal()
config = db.query(GatewayConfig).filter(GatewayConfig.id == "paycrm").first().config_data
provider = registry.get("paycrm")

tx_id = "TXND20F143AEA2E"
utr = "207582458093"

tx = db.query(Transaction).filter(Transaction.id == tx_id).first()

if not tx:
    print(f"Transaction {tx_id} not found in DB.")
else:
    print(f"Found Transaction {tx.id}")
    print(f"Gateway ID: {tx.gateway_id}")
    print(f"Reference ID (Gateway Order ID): {tx.reference_id}")
    print(f"Status: {tx.status}")
    
    # print("\n=== ACTIVATE DEPOSIT ===")
    # success, msg, data = provider.activate_deposit(tx.reference_id, utr, config)
    # print("Success:", success)
    # print("Message:", msg)
    # print("Data:", data)

    print("\n=== CHECK STATUS ===")
    success_s, msg_s, data_s = provider.check_status(tx.reference_id, config)
    print("Success:", success_s)
    print("Message:", msg_s)
    print("Data:", data_s)
