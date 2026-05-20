import uuid
import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, JSON
from app.database import Base

class GatewayConfig(Base):
    __tablename__ = "gateway_configs"

    id = Column(String, primary_key=True, index=True)  # e.g., 'stripe', 'paypal'
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    config_data = Column(JSON, default=dict, nullable=False)  # stores live credentials loaded from DB
    credentials_schema = Column(JSON, default=list, nullable=False)  # declared schema for dynamic form rendering

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: f"TXN{uuid.uuid4().hex[:12].upper()}", index=True)
    reference_id = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    redirect_url = Column(String, nullable=True)
    gateway_id = Column(String, nullable=False)
    status = Column(String, nullable=False)  # 'success', 'failed'
    error_message = Column(String, nullable=True)
    qr_string = Column(String, nullable=True)
    payment_url = Column(String, nullable=True)
    utr = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
