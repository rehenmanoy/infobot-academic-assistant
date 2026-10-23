"""Application settings, loaded from environment variables (and an optional .env file)."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"

    database_url: str = "sqlite:///./infobot.db"

    # Required. Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"
    secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    access_token_expire_minutes: int = Field(default=60, ge=5, le=60 * 24)

    # Comma-separated list, e.g. "http://localhost:5173,https://infobot.example.com"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    upload_dir: Path = Path("uploads")
    max_upload_mb: int = Field(default=10, ge=1, le=50)

    # Login throttling: max failed attempts per (ip, username) inside the window.
    login_max_attempts: int = 5
    login_window_seconds: int = 300

    # AI assistant. Leave the key empty to run without the chatbot.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"
    chat_max_tokens: int = Field(default=4096, ge=256, le=16000)
    chat_requests_per_minute: int = 10

    # Optional bootstrap admin, created on startup if no admin exists yet.
    admin_username: str | None = None
    admin_password: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("secret_key")
    @classmethod
    def _reject_placeholder_secret(cls, value: str) -> str:
        if "change-me" in value.lower():
            raise ValueError("SECRET_KEY still has the placeholder value; generate a real one")
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def ai_enabled(self) -> bool:
        return bool(self.anthropic_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
