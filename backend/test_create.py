import requests
from app.database import SessionLocal
from app.models import GatewayConfig

db = SessionLocal()
config = db.query(GatewayConfig).filter(GatewayConfig.id == "paycrm").first().config_data

project_id = config.get("project_id", "")
apikey = config.get("apikey", "")
host = config.get("host", "https://pay-crm.com").rstrip("/")

endpoint = f"{host}/Remotes/create-deposit"

headers = {
    "Content-Type": "application/json",
    "apikey": apikey
}

payload = {
    "amount": "500",
    "currency": "INR",
    "payment_system": "upi_p2p",
    "data": {},
    "custom_transaction_id": "TEST_123456",
    "custom_user_id": "1",
    "return_url": "http://localhost:5173"
}
resp = requests.post(endpoint, params={"project_id": project_id}, json=payload, headers=headers)

print("=== REQUEST ===")
print("URL:", resp.request.url)
print("Method:", resp.request.method)
print("Headers:")
for k, v in resp.request.headers.items():
    print(f"  {k}: {v}")
print("Body:")
print(resp.request.body.decode('utf-8') if resp.request.body else "")

print("\n=== RESPONSE ===")
print("Status Code:", resp.status_code)
print("Headers:")
for k, v in resp.headers.items():
    print(f"  {k}: {v}")
print("Body:")
print(resp.text)
