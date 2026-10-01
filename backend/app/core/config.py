from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "PolicyLens API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # CORS Configuration
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        return self.ALLOWED_ORIGINS

    # Database Configuration (SQLite default, ready for PostgreSQL swap)
    DATABASE_URL: str = "sqlite:///./policylens.db"

    # AI Integration Settings (Step 3)
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-1.5-pro"
    AI_PROVIDER: str = "google"  # "google" | "openai" – extend as needed
    AI_MAX_RETRIES: int = 2
    AI_CHUNK_CHARS: int = 60000  # Max chars per AI chunk (~15k tokens)
    MAX_UPLOAD_SIZE_MB: int = 25

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
