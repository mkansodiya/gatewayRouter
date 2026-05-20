from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://gateway_user:gateway_password@db:5432/gateway_router"
    PROJECT_NAME: str = "Payment Gateway Router"
    API_V1_STR: str = "/api"
    FRONTEND_BASE_URL: str = "https://grdash.pay2mall.com"
    JWT_SECRET: str = "change-me-in-production-use-a-long-random-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    class Config:
        env_file = ".env"

settings = Settings()
