from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class OrderCreateRequest(BaseModel):
    referenceId: str = Field(..., description="Unique merchant reference ID")
    amount: float = Field(..., gt=0, description="Amount to be charged")
    description: Optional[str] = Field("", description="Brief description of the order")
    redirectUrl: Optional[str] = Field("", description="Callback/redirect URL")

class VerifyRequest(BaseModel):
    utr: str = Field(..., description="The user-provided UTR or verification key")

class OrderResponseData(BaseModel):
    transactionId: str
    amount: str
    paymentUrl: str
    referenceId: str
    qr_string: str

class OrderCreateResponse(BaseModel):
    status: str
    message: str
    data: OrderResponseData

class TransactionResponse(BaseModel):
    id: str
    reference_id: str
    amount: float
    description: Optional[str] = None
    redirect_url: Optional[str] = None
    gateway_id: str
    status: str
    error_message: Optional[str] = None
    qr_string: Optional[str] = None
    payment_url: Optional[str] = None
    utr: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GatewayUpdate(BaseModel):
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    config_data: Optional[Dict[str, Any]] = None

class GatewayResponse(BaseModel):
    id: str
    name: str
    is_active: bool
    sort_order: int
    config_data: Dict[str, Any]
    credentials_schema: List[Dict[str, str]] = []

    class Config:
        from_attributes = True

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    status: str
    token: str

class AdminUpdateRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

