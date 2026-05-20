from fastapi import FastAPI, Depends, HTTPException, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import time
import hashlib
import jwt
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.database import engine, Base, get_db
from app.models import GatewayConfig, Transaction, Admin
from app.schemas import (
    OrderCreateRequest, OrderCreateResponse, OrderResponseData,
    GatewayUpdate, GatewayResponse, TransactionResponse,
    AdminLoginRequest, AdminLoginResponse
)
from app.registry import registry
from app.router import router_service

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development. In production, restrict to specific origins.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_jwt_token(username: str) -> str:
    """Issue a signed HS256 JWT with an expiry."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def verify_admin_token(authorization: Optional[str] = Header(None)) -> str:
    """FastAPI dependency — validates the JWT and returns the subject (username)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub", "")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.on_event("startup")
def startup_populate_gateways():
    """
    On startup, sync discovered gateways and seed default admin.
    """
    db = next(get_db())
    try:
        discovered_gateways = registry.get_all()
        default_configs = {
            "okpay": {
                "mch_id":     "1000",
                "key":        "eb6080dbc8dc429ab86a1cd1c337975d",
                "host":       "https://sandbox.wpay.one",
                "notify_url": "",
            },
            "lgpay": {
                "app_id":        "YD5094",
                "key":           "uWqMeuvOwTo15FduVGoRULqx8KIFv0lQ",
                "trade_type":    "INRUPI",
                "exchange_rate": "1",   # 1 = send INR×100 directly (no BDT conversion)
                "notify_url":    "",    # Set to your public webhook URL
            },
            "jazpays": {
                "merchant_id": "",
                "api_key":     "",
                "notify_url":  "",
            },
        }

        current_sort_order = 0
        for gateway_id, provider in discovered_gateways.items():
            schema = provider.credentials_schema  # declared by provider code
            db_gateway = db.query(GatewayConfig).filter(GatewayConfig.id == gateway_id).first()
            if not db_gateway:
                # New provider discovered — seed with empty credentials (must be filled via admin UI)
                default_data = default_configs.get(gateway_id, {})
                new_gateway = GatewayConfig(
                    id=gateway_id,
                    name=provider.name,
                    is_active=True,
                    sort_order=current_sort_order,
                    config_data=default_data,
                    credentials_schema=schema,
                )
                db.add(new_gateway)
                print(f"Seeded new gateway: {gateway_id}")
                current_sort_order += 1
            else:
                # Existing provider — always sync latest schema from code (schema is code, not data)
                db_gateway.credentials_schema = schema
                
        # Seed default admin user (admin / admin123)
        admin_exists = db.query(Admin).filter(Admin.username == "admin").first()
        if not admin_exists:
            new_admin = Admin(
                username="admin",
                hashed_password=hash_password("admin123")
            )
            db.add(new_admin)
            print("Default admin user seeded successfully (admin/admin123).")

        db.commit()
    except Exception as e:
        print(f"Error during startup DB seeding: {e}")
    finally:
        db.close()

@app.post("/api/orders", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreateRequest, db: Session = Depends(get_db)):
    """
    Rest API endpoint for creating/initiating a payment order.
    Automatically routes the payment using Round-Robin router.
    """
    try:
        # Process order via router
        transaction = router_service.route_and_process(
            db=db,
            reference_id=payload.referenceId,
            amount=payload.amount,
            description=payload.description or "",
            redirect_url=payload.redirectUrl or ""
        )
        
        if transaction.status == "failed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment failed: {transaction.error_message}"
            )
            
        formatted_amount = f"{transaction.amount:.2f}"
        
        # Generate the unified frontend checkout URL from env config
        unified_payment_url = f"{settings.FRONTEND_BASE_URL}/pay/{transaction.id}"

        response_data = OrderResponseData(
            transactionId=transaction.id,
            amount=formatted_amount,
            paymentUrl=unified_payment_url,
            referenceId=transaction.reference_id,
            qr_string=transaction.qr_string or ""
        )
        
        return OrderCreateResponse(
            status="success",
            message="Transaction initiated",
            data=response_data
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order creation failed unexpectedly: {str(e)}"
        )

@app.get("/api/gateways", response_model=List[GatewayResponse])
def get_gateways(db: Session = Depends(get_db), _ = Depends(verify_admin_token)):
    """
    Get all payment gateways with their database status and configuration.
    """
    gateways = db.query(GatewayConfig).order_by(GatewayConfig.sort_order.asc(), GatewayConfig.id.asc()).all()
    return gateways

@app.post("/api/admin/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    hashed = hash_password(payload.password)
    admin = db.query(Admin).filter(
        Admin.username == payload.username,
        Admin.hashed_password == hashed
    ).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin username or password."
        )
    token = create_jwt_token(admin.username)
    return AdminLoginResponse(status="success", token=token)

@app.patch("/api/gateways/{gateway_id}", response_model=GatewayResponse)
def update_gateway(
    gateway_id: str,
    payload: GatewayUpdate,
    db: Session = Depends(get_db),
    _ = Depends(verify_admin_token)
):
    """
    Update configuration of a specific gateway (is_active status, sort order, custom config fields).
    Requires administrative permissions.
    """
    db_gateway = db.query(GatewayConfig).filter(GatewayConfig.id == gateway_id).first()
    if not db_gateway:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gateway with ID '{gateway_id}' not found."
        )
        
    if payload.is_active is not None:
        db_gateway.is_active = payload.is_active
        
    if payload.sort_order is not None:
        db_gateway.sort_order = payload.sort_order
        
    if payload.config_data is not None:
        # Merge dictionary configs
        merged_config = dict(db_gateway.config_data or {})
        merged_config.update(payload.config_data)
        db_gateway.config_data = merged_config
        
    db.commit()
    db.refresh(db_gateway)
    return db_gateway

@app.get("/api/transactions", response_model=List[TransactionResponse])
def get_transactions(db: Session = Depends(get_db), _ = Depends(verify_admin_token)):
    """
    Retrieve transaction history logs.
    """
    transactions = db.query(Transaction).order_by(Transaction.created_at.desc()).all()
    return transactions

@app.get("/api/transactions/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """
    Publicly accessible endpoint to fetch transaction details for the payment page.
    If the transaction is still pending, attempts a live status check via the
    provider's query API (if supported). Updates the DB and returns fresh status.
    """
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found."
        )

    # ── Live status check for pending transactions ─────────────────────────────
    if transaction.status == "pending" and transaction.gateway_id:
        try:
            provider = registry.get(transaction.gateway_id)
            if provider and hasattr(provider, "query_payment"):
                # Load gateway config from DB
                db_gateway = db.query(GatewayConfig).filter(
                    GatewayConfig.id == transaction.gateway_id
                ).first()
                if db_gateway and db_gateway.config_data:
                    result = provider.query_payment(
                        transaction.reference_id,
                        db_gateway.config_data
                    )
                    print(f"Status check [{transaction.gateway_id}] tx={transaction_id}: {result}")
                    # LGPay: status=1 means paid
                    if result.get("status") == 1:
                        data = result.get("data", {})
                        transaction.status = "success"
                        transaction.error_message = None
                        transaction.utr = (
                            data.get("trade_no")
                            or data.get("order_sn")
                            or transaction.reference_id
                        )
                        db.commit()
                        db.refresh(transaction)
        except Exception as e:
            # Non-fatal — log and return current DB state
            print(f"Status check failed for {transaction_id}: {e}")

    return transaction


@app.get("/api/router/status")
def get_router_status(db: Session = Depends(get_db), _ = Depends(verify_admin_token)):
    """
    Fetch the router state, active queue, and next gateway up.
    """
    active_db_gateways = db.query(GatewayConfig)\
        .filter(GatewayConfig.is_active == True)\
        .order_by(GatewayConfig.sort_order.asc(), GatewayConfig.id.asc())\
        .all()
        
    total_tx_count = db.query(Transaction).count()
    
    next_gateway_id = None
    next_gateway_name = None
    queue_order = [g.id for g in active_db_gateways]
    
    if active_db_gateways:
        next_index = total_tx_count % len(active_db_gateways)
        next_gateway = active_db_gateways[next_index]
        next_gateway_id = next_gateway.id
        next_gateway_name = next_gateway.name

    return {
        "total_transactions": total_tx_count,
        "active_gateways_count": len(active_db_gateways),
        "queue_order": queue_order,
        "next_gateway_id": next_gateway_id,
        "next_gateway_name": next_gateway_name,
        "server_timestamp": time.time()
    }

@app.post("/api/webhooks/okpay")
async def okpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    OkPay async payment notification (webhook).

    OkPay POSTs form-encoded data. We verify the MD5 signature,
    find the matching transaction by reference_id (out_trade_no),
    and mark it as successful.

    Must respond with plain text "success" on acceptance.
    """
    from fastapi.responses import PlainTextResponse
    from app.providers.okpay import OkPayGateway

    form = await request.form()
    data = dict(form)

    incoming_sign = data.pop("sign", "")

    # Look up OkPay config to get the signing key
    db_gateway = db.query(GatewayConfig).filter(GatewayConfig.id == "okpay").first()
    if not db_gateway:
        return PlainTextResponse("error")

    mch_key = db_gateway.config_data.get("key", "")
    computed_sign = OkPayGateway._generate_sign(data, mch_key)

    if incoming_sign.lower() != computed_sign:
        print(f"OkPay webhook: signature mismatch (got={incoming_sign}, want={computed_sign})")
        return PlainTextResponse("error")

    out_trade_no = data.get("out_trade_no", "")
    status_val   = int(data.get("status", 0))

    if not out_trade_no or status_val != 1:
        return PlainTextResponse("error")

    # Find the transaction by reference_id
    tx = db.query(Transaction).filter(Transaction.reference_id == out_trade_no).first()
    if tx:
        tx.status = "success"
        tx.error_message = None
        tx.utr = data.get("trade_no")
        # Ensure we don't overwrite qr_string if we don't have to, but okpay provided it as trade_no in original code? 
        # Actually okpay returns trade_no which is the UTR.
        db.commit()
        print(f"OkPay webhook: order {out_trade_no} marked as SUCCESS (utr={tx.utr})")

    return PlainTextResponse("success")

@app.post("/api/webhooks/imb")
async def imb_webhook(request: Request, db: Session = Depends(get_db)):
    """
    IMB async payment notification (webhook).

    IMB POSTs form-encoded data with:
        order_id  - The numeric order ID sent at order creation
        status    - String "SUCCESS" on confirmed payment

    No signature verification is required for IMB (token-only auth).
    Must respond with a 200 OK to acknowledge receipt.
    """
    from fastapi.responses import PlainTextResponse

    form = await request.form()
    data = dict(form)

    order_id   = data.get("order_id", "").strip()
    txn_status = data.get("status", "").strip()

    if not order_id:
        print("IMB webhook: missing order_id")
        return PlainTextResponse("error", status_code=400)

    if not txn_status:
        print("IMB webhook: missing status")
        return PlainTextResponse("error", status_code=400)

    if txn_status != "SUCCESS":
        print(f"IMB webhook: order {order_id} status={txn_status} — not marking as success")
        return PlainTextResponse("ok")

    # Find the transaction by reference_id (the numeric order_id we stored)
    tx = db.query(Transaction).filter(Transaction.reference_id == order_id).first()
    if not tx:
        print(f"IMB webhook: no transaction found for order_id={order_id}")
        return PlainTextResponse("error", status_code=404)

    tx.status = "success"
    tx.error_message = None
    # IMB does not return a UTR in the callback — set to the order_id as acknowledgement
    tx.utr = data.get("utr") or order_id
    db.commit()
    print(f"IMB webhook: order {order_id} marked as SUCCESS")

    return PlainTextResponse("success")

@app.post("/api/webhooks/lgpay")
async def lgpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    LGPay async payment notification (webhook).

    LGPay POSTs form-encoded data with:
        order_sn - Your original order serial number
        status   - Integer 1 = payment success
        sign     - UPPERCASE MD5 signature to verify authenticity

    Per documentation: respond with plain text 'ok' on success.
    (NOT 'success' like OkPay — LGPay retries if it gets anything else.)
    """
    from fastapi.responses import PlainTextResponse
    from app.providers.lgpay import LGPayGateway

    form = await request.form()
    data = dict(form)

    incoming_sign = data.pop("sign", "")

    # Look up LGPay config to get the signing key
    db_gateway = db.query(GatewayConfig).filter(GatewayConfig.id == "lgpay").first()
    if not db_gateway:
        return PlainTextResponse("error")

    mch_key       = db_gateway.config_data.get("key", "")
    computed_sign = LGPayGateway._generate_sign(data, mch_key)

    if incoming_sign != computed_sign:   # LGPay signs are UPPERCASE — compare directly
        print(f"LGPay webhook: signature mismatch (got={incoming_sign}, want={computed_sign})")
        return PlainTextResponse("error")

    order_sn   = data.get("order_sn", "").strip()
    status_val = int(data.get("status", 0))

    if not order_sn:
        return PlainTextResponse("error")

    if status_val != 1:
        print(f"LGPay webhook: order {order_sn} status={status_val} — not marking as success")
        return PlainTextResponse("ok")   # Acknowledge but do nothing

    # Find the transaction by reference_id (the order_sn we sent at order creation)
    tx = db.query(Transaction).filter(Transaction.reference_id == order_sn).first()
    if tx and tx.status == "pending":
        tx.status = "success"
        tx.error_message = None
        tx.utr = order_sn  # LGPay does not return a distinct UTR; use order_sn
        db.commit()
        print(f"LGPay webhook: order {order_sn} marked as SUCCESS")
    elif tx and tx.status == "success":
        print(f"LGPay webhook: order {order_sn} already SUCCESS — acknowledging again")

    return PlainTextResponse("ok")   # LGPay expects exactly 'ok'

@app.post("/api/webhooks/jazpays")
async def jazpays_webhook(request: Request, db: Session = Depends(get_db)):
    """
    JazPays async payment notification (webhook).

    JazPays POSTs a JSON payload (or form-encoded) with:
        orderNo       - JazPays' internal order number
        merchantOrder - Your original order/transaction reference
        status        - success / failed
        amount        - Decimal/Integer amount
        signature     - MD5 signature
    """
    from fastapi.responses import PlainTextResponse
    from app.providers.jazpays import JazPaysGateway

    # Support both JSON and Form payload dynamically
    if request.headers.get("content-type") == "application/json" or "application/json" in request.headers.get("content-type", ""):
        try:
            data = await request.json()
        except ValueError:
            print("JazPays webhook: invalid JSON request body")
            return PlainTextResponse("error", status_code=400)
    else:
        form = await request.form()
        data = dict(form)

    print(f"JazPays webhook: received data -> {data}")

    merchant_order = data.get("merchantOrder", "").strip()
    status_str     = data.get("status", "").strip().lower()
    order_no       = data.get("orderNo", "").strip()

    if not merchant_order:
        print("JazPays webhook: missing merchantOrder reference")
        return PlainTextResponse("error", status_code=400)

    # Look up JazPays config to get the api_key secret
    db_gateway = db.query(GatewayConfig).filter(GatewayConfig.id == "jazpays").first()
    if not db_gateway:
        print("JazPays webhook: JazPays configuration not found in DB")
        return PlainTextResponse("error", status_code=500)

    api_key = db_gateway.config_data.get("api_key", "").strip()
    if not api_key:
        print("JazPays webhook: api_key not configured in database")
        return PlainTextResponse("error", status_code=500)

    # Verify signature
    if not JazPaysGateway.verify_webhook_signature(data, api_key):
        print("JazPays webhook: signature verification failed")
        return PlainTextResponse("error", status_code=400)

    if status_str != "success":
        print(f"JazPays webhook: order {merchant_order} status={status_str} — not marking as success")
        return PlainTextResponse("success")   # Return success to stop retries as per validation protocol

    # Find the transaction by reference_id (merchantOrder)
    tx = db.query(Transaction).filter(Transaction.reference_id == merchant_order).first()
    if not tx:
        print(f"JazPays webhook: no transaction found for merchantOrder={merchant_order}")
        return PlainTextResponse("error", status_code=404)

    # Validation Protocol: Strictly match amount
    # Note: DB amount is float. Webhook amount is decimal/integer.
    try:
        incoming_amount = float(data.get("amount", 0))
        if abs(incoming_amount - tx.amount) > 0.01:
            print(f"JazPays webhook: amount mismatch (got={incoming_amount}, want={tx.amount})")
            return PlainTextResponse("error", status_code=400)
    except (ValueError, TypeError):
        print("JazPays webhook: invalid amount in webhook payload")
        return PlainTextResponse("error", status_code=400)

    # Acknowledge and update transaction status to success
    if tx.status == "pending":
        tx.status = "success"
        tx.error_message = None
        tx.utr = order_no or merchant_order  # Store JazPays orderNo as UTR
        db.commit()
        print(f"JazPays webhook: order {merchant_order} marked as SUCCESS")
    elif tx.status == "success":
        print(f"JazPays webhook: order {merchant_order} already SUCCESS — acknowledging again")

    return PlainTextResponse("success")   # Return success to stop retries
