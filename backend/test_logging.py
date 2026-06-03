import requests
from app.database import SessionLocal
from app.models import GatewayConfig

db = SessionLocal()
config = db.query(GatewayConfig).filter(GatewayConfig.id == "paycrm").first().config_data

project_id = config.get("project_id", "")
apikey = config.get("apikey", "")
host = config.get("host", "https://pay-crm.com").rstrip("/")

order_id = "6a1ff8d6efae91e2"

# 2. STATUS CHECK
status_endpoint = f"{host}/Remotes/deposit-info"
status_params = {"project_id": project_id, "order_id": order_id}
status_headers = {"apikey": apikey}

print("\n=========================================")
print("            CHECK STATUS API")
print("=========================================")
resp_stat = requests.get(status_endpoint, params=status_params, headers=status_headers)

print("=== REQUEST ===")
print("Method:", resp_stat.request.method)
print("URL:", resp_stat.request.url)
print("Headers:")
for k, v in resp_stat.request.headers.items():
    print(f"  {k}: {v}")

print("\n=== RESPONSE ===")
print("Status Code:", resp_stat.status_code)
print("Headers:")
for k, v in resp_stat.headers.items():
    print(f"  {k}: {v}")
print("Body:")
print(resp_stat.text)
