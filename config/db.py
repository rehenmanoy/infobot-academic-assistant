from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    DEBUG: bool = False
    openai_api_key: str
    anthropic_api_key:str

    class Config:
        # env_file = "../.env"
        env_file = ".env"

settings = Settings()
DATABASE_URL = settings.DATABASE_URL
openai_api_key = settings.openai_api_key
anthropic_api_key = settings.anthropic_api_key
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()