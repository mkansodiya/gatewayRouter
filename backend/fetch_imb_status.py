"""
Scratch script: Fetch the last IMB transaction from DB and call IMB Check Status API.
Run from: /home/ubuntu/projects/gatewayRouter/backend/
"""
import sys
import os
import json
import requests

# Allow imports from app/
sys.path.insert(0, os.path.dirname(__file__))

# Load env if .env exists
from dotenv import load_dotenv  # type: ignore
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import SessionLocal
from app.models import Transaction, GatewayConfig

db = SessionLocal()

# ── 1. Fetch last IMB transaction ─────────────────────────────────────────────
tx = (
    db.query(Transaction)
    .filter(Transaction.gateway_id == "imb")
    .order_by(Transaction.created_at.desc())
    .first()
)

if not tx:
    print("❌  No IMB transaction found in the database.")
    db.close()
    sys.exit(1)

print("=" * 60)
print("Last IMB Transaction (from DB)")
print("=" * 60)
print(f"  Transaction ID : {tx.id}")
print(f"  Reference ID   : {tx.reference_id}   ← IMB order_id")
print(f"  Amount         : {tx.amount}")
print(f"  DB Status      : {tx.status}")
print(f"  UTR            : {tx.utr or '(none)'}")
print(f"  Created At     : {tx.created_at}")
print()

# ── 2. Load IMB credentials from DB ───────────────────────────────────────────
gw = db.query(GatewayConfig).filter(GatewayConfig.id == "imb").first()
db.close()

if not gw or not gw.config_data:
    print("❌  IMB gateway config not found or empty.")
    sys.exit(1)

api_key = gw.config_data.get("api_key", "").strip()
if not api_key:
    print("❌  IMB api_key is not configured in the database.")
    sys.exit(1)

# ── 3. Call IMB Check Status API ──────────────────────────────────────────────
CHECK_STATUS_URL = "https://secure-stage.imb.org.in/api/check-order-status"
payload = {
    "user_token": api_key,
    "order_id":   tx.reference_id,
}

print("Calling IMB Check Status API …")
print(f"  URL      : {CHECK_STATUS_URL}")
print(f"  order_id : {tx.reference_id}")
print()

try:
    resp = requests.post(
        CHECK_STATUS_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    print(f"  HTTP Status : {resp.status_code}")
    try:
        result = resp.json()
        print("=" * 60)
        print("IMB API Response")
        print("=" * 60)
        print(json.dumps(result, indent=2))

        # Interpret result
        top_status = str(result.get("status", "")).upper()
        inner = result.get("result", {}) if isinstance(result.get("result"), dict) else {}
        is_success = top_status == "COMPLETED" and str(inner.get("status", "")).upper() == "SUCCESS"
        utr = inner.get("utr", "(none)")

        print()
        print("=" * 60)
        print("Interpretation")
        print("=" * 60)
        print(f"  Payment Successful : {'✅ YES' if is_success else '❌ NO'}")
        print(f"  IMB Status        : {top_status}")
        print(f"  UTR               : {utr}")
        print(f"  Message           : {result.get('message', '')}")
    except ValueError:
        print("  ⚠️  Response is not valid JSON:")
        print(resp.text)
except requests.exceptions.Timeout:
    print("❌  Request timed out (30s).")
except requests.exceptions.RequestException as exc:
    print(f"❌  Network error: {exc}")
