import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / "frontend" / ".env")

class Settings(BaseSettings):
    APP_NAME: str = "PlantCare API"
    ENVIRONMENT: str = "development"
    
    # Database URL: defaults to local SQLite if DATABASE_URL is not set or empty, supports Neon PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/plantcare.db")
    
    # Clerk Authentication
    CLERK_PUBLISHABLE_KEY: str = (
        os.getenv("CLERK_PUBLISHABLE_KEY")
        or os.getenv("VITE_CLERK_PUBLISHABLE_KEY")
        or ""
    )
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    
    # Groq API for Multilingual Chatbot
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # OpenWeather API Key
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    
    # Static uploads directory
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MODEL_PATH: Path = BASE_DIR / "ml" / "model.h5"
    
    # Outbreak detection radius (in kilometers) and rolling time window (in days)
    OUTBREAK_RADIUS_KM: float = 30.0
    OUTBREAK_WINDOW_DAYS: int = 7
    OUTBREAK_MIN_REPORTS: int = 3
    
    # Dev authentication bypass (enabled for dev testing scripts)
    ALLOW_DEV_USER_HEADER: bool = os.getenv("ALLOW_DEV_USER_HEADER", "true").lower() in ("true", "1")

    # Groq LLM model
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    class Config:
        env_file = BASE_DIR / ".env"
        extra = "ignore"

settings = Settings()

# Ensure uploads and ml folders exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
