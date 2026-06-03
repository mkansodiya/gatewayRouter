from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Tuple, Dict, Any
from app.registry import registry
from app.models import GatewayConfig, Transaction
from app.providers.base import BasePaymentGateway

class PaymentRouter:
    
    def get_active_gateways(self, db: Session) -> List[GatewayConfig]:
        """
        Fetch all active gateways from the database, sorted by sort_order and id.
        """
        return db.query(GatewayConfig).filter(GatewayConfig.is_active == True).order_by(GatewayConfig.sort_order.asc(), GatewayConfig.id.asc()).all()

    def get_next_gateway(self, db: Session, amount: float) -> Tuple[BasePaymentGateway, GatewayConfig]:
        """
        Determine the next gateway using the round-robin logic.
        If amount >= 500, always route directly to 'paycrm' (if active).
        Otherwise, use round-robin (skipping 'paycrm').
        """
        # Fetch active gateways from DB
        # Note: We sort by sort_order first, then by id to keep it deterministic.
        active_db_gateways = db.query(GatewayConfig)\
            .filter(GatewayConfig.is_active == True)\
            .order_by(GatewayConfig.sort_order.asc(), GatewayConfig.id.asc())\
            .all()
            
        if not active_db_gateways:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No active payment gateways configured in the router."
            )

        # Direct routing to Pay-CRM for 500+
        if amount >= 500:
            paycrm_gateway = next((g for g in active_db_gateways if g.id == "paycrm"), None)
            if paycrm_gateway:
                provider = registry.get("paycrm")
                if not provider:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Payment provider logic for 'paycrm' could not be loaded."
                    )
                return provider, paycrm_gateway
            
        # Get count of total transactions
        total_tx_count = db.query(Transaction).count()
        
        # Round robin calculation with skip logic
        for i in range(len(active_db_gateways)):
            next_index = (total_tx_count + i) % len(active_db_gateways)
            db_gateway = active_db_gateways[next_index]
            
            # Skip paycrm if amount is less than 500
            if db_gateway.id == "paycrm" and amount < 500:
                continue
            
            # Resolve the provider implementation from registry
            provider = registry.get(db_gateway.id)
            if not provider:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Payment provider logic for '{db_gateway.id}' could not be loaded."
                )
                
            return provider, db_gateway
            
        # If all were skipped (e.g. only paycrm is active and amount < 500)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No suitable payment gateways available for this transaction."
        )

    def route_and_process(self, db: Session, reference_id: str, amount: float, description: str, redirect_url: str) -> Transaction:
        """
        Selects the next gateway, processes the payment, records the transaction, and returns it.
        """
        provider, db_gateway = self.get_next_gateway(db, amount)
        
        # Process the payment using the provider instance
        success, error_message, qr_string, payment_url, gateway_order_id = provider.process_payment(
            amount=amount,
            description=description,
            redirect_url=redirect_url,
            config=db_gateway.config_data
        )

        # Use the gateway's own order ID as reference_id so the webhook handler
        # can look up the transaction by the ID that the provider knows about.
        # Fall back to the merchant's reference_id if the provider doesn't generate one.
        stored_reference_id = gateway_order_id if gateway_order_id else reference_id
        
        # Record transaction in database
        transaction = Transaction(
            reference_id=stored_reference_id,
            amount=amount,
            description=description,
            redirect_url=redirect_url,
            gateway_id=provider.id,
            status="pending" if success else "failed",
            error_message=error_message if not success else None,
            qr_string=qr_string,
            payment_url=payment_url
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return transaction

# Global router instance
router_service = PaymentRouter()
