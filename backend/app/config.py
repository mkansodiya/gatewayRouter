from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://gateway_user:gateway_password@db:5432/gateway_router"
    PROJECT_NAME: str = "Payment Gateway Router"
    API_V1_STR: str = "/api"

    class Config:
        env_file = ".env"

settings = Settings()
