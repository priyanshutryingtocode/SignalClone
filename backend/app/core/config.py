from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days, fine for a demo
    DATABASE_URL: str = "sqlite:///./signal_clone.db"
    MOCK_OTP: str = "123456"


settings = Settings()
