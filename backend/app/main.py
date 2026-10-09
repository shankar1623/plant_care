from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import engine, Base
from app.models import *  # Ensure all models are registered
from app.services.predictor import get_predictor

from app.routers import detect, treatment, chat, outbreak, dashboard

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("plantcare")

# Initialize database tables on load
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PlantCare database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    logger.info("Pre-warming model predictor...")
    try:
        get_predictor()
        logger.info("Model loaded and ready for inference.")
    except Exception as e:
        logger.warning(f"Model warm-up note: {e}")

    yield
    logger.info("PlantCare shutting down gracefully.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Advanced Crop Health Intelligence API with 5-feature loop, 25km outbreak radar, and multilingual AI doctor",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vite port 5173, localhost, preview ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded images static folder
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include feature routers
app.include_router(detect.router)
app.include_router(treatment.router)
app.include_router(chat.router)
app.include_router(outbreak.router)
app.include_router(dashboard.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "database": "connected",
        "model_loaded": get_predictor().model is not None,
        "classes_count": len(get_predictor().class_names)
    }
