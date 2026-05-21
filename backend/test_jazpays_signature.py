"""
Test JazPays webhook signature against the actual received payload.
Run from: /home/ubuntu/projects/gatewayRouter/backend/
"""
import sys, os, hashlib, itertools

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import SessionLocal
from app.models import GatewayConfig

# ── Actual payload received from JazPays ─────────────────────────────────────
payload = {
    "orderNo":       "PININR20260521022039526WF3F",
    "merchantOrder": "ORD125D2FADE6BF",
    "status":        "success",
    "amount":        100,
}

# ── Load api_key from DB ──────────────────────────────────────────────────────
db = SessionLocal()
gw = db.query(GatewayConfig).filter(GatewayConfig.id == "jazpays").first()
db.close()

if not gw or not gw.config_data:
    print("❌  JazPays config not found in DB.")
    sys.exit(1)

api_key     = gw.config_data.get("api_key", "").strip()
merchant_id = gw.config_data.get("merchant_id", "").strip()

print("=" * 60)
print("JazPays Signature Test")
print("=" * 60)
print(f"  api_key     : {api_key!r}")
print(f"  merchant_id : {merchant_id!r}")
print(f"  Payload     : {payload}")
print()

# ── Amount candidates ─────────────────────────────────────────────────────────
amount_candidates = ["100", "100.0", "100.00", 100]

# ── Key name candidates ───────────────────────────────────────────────────────
# JazPays may use different field names in webhook vs create API
field_map_candidates = [
    # (field_names_to_include_from_payload, label)
    (["orderNo", "merchantOrder", "status", "amount"],           "all fields"),
    (["merchantOrder", "status", "amount"],                       "no orderNo"),
    (["orderNo", "merchantOrder", "amount"],                      "no status"),
    (["merchantOrder", "amount"],                                 "merchantOrder+amount"),
    (["orderNo", "amount"],                                       "orderNo+amount"),
]

def md5(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest().lower()

print("Trying all signing combinations...\n")

found = False
for fields, label in field_map_candidates:
    for amt in amount_candidates:
        p = {k: str(payload.get(k, "")) for k in fields}
        if "amount" in p:
            p["amount"] = str(amt)

        sorted_keys = sorted(p.keys())
        parts = [f"{k}={p[k]}" for k in sorted_keys]

        # Variant A: joined with & + &key=
        s1 = "&".join(parts) + f"&key={api_key}"
        # Variant B: joined with & (no trailing &) + key=
        s2 = "&".join(parts) + f"key={api_key}"
        # Variant C: with trailing & on each part
        s3 = "".join(f"{k}={p[k]}&" for k in sorted_keys) + f"key={api_key}"

        for variant, sign_str in [("A", s1), ("B", s2), ("C", s3)]:
            h = md5(sign_str)
            print(f"  [{label}] [Variant {variant}] sign_str={sign_str!r}")
            print(f"           → MD5: {h}")
            # No incoming signature to compare against since JazPays didn't send one
            # But we show what we'd generate

print()
print("=" * 60)
print("Note: JazPays did NOT send a 'signature' field in the webhook.")
print("The above shows what our system would compute for each variant.")
print("Share the JazPays docs to confirm which variant is correct.")
print("=" * 60)
