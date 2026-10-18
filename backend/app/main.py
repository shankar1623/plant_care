import re
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import logging

from app.config import settings, BASE_DIR
from app.database import engine, Base, get_db
from app.models import Diagnosis, TreatmentPlan, TreatmentCheckin, OutbreakReport
from app.auth import get_optional_user_id
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
    description="Advanced Crop Health Intelligence API with 5-feature loop, 25km outbreak radar, and multilingual AI chat bot",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for approved frontend domains (never wildcard '*' when credentials enabled)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Secure handler for uploaded images (validates filename, path traversal, and enforces user privacy)
@app.get("/uploads/{filename}")
async def get_uploaded_image(
    filename: str,
    db: Session = Depends(get_db),
    current_user_id: str | None = Depends(get_optional_user_id)
):
    # 1. Strict filename validation (prevent path traversal or malicious extensions)
    if not re.match(r"^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$", filename, re.IGNORECASE):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")

    upload_dir_resolved = settings.UPLOAD_DIR.resolve()
    safe_path = (settings.UPLOAD_DIR / filename).resolve()

    if not safe_path.is_relative_to(upload_dir_resolved) or not safe_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")

    # 2. Check if image is part of an Outbreak report (shared radar alert)
    is_outbreak = db.query(OutbreakReport).filter(OutbreakReport.image_url.contains(filename)).first()
    if is_outbreak:
        return _serve_image_file(safe_path)

    # 3. Check if image belongs to a private Diagnosis
    diag = db.query(Diagnosis).filter(Diagnosis.image_url.contains(filename)).first()
    owner_id = diag.user_id if diag else None

    # 4. Check if image belongs to a private Treatment Plan Checkin
    if not owner_id:
        checkin = db.query(TreatmentCheckin).filter(TreatmentCheckin.image_url.contains(filename)).first()
        if checkin:
            plan = db.query(TreatmentPlan).filter(TreatmentPlan.id == checkin.treatment_id).first()
            if plan:
                owner_id = plan.user_id

    # 5. Enforce privacy protection if image has a registered owner
    if owner_id:
        if not current_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view private scan images."
            )
        if current_user_id != owner_id:
            logger.warning(
                f"Unauthorized access attempt to private image {filename} by user {current_user_id} (owner: {owner_id})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this private image."
            )

    return _serve_image_file(safe_path)

def _serve_image_file(file_path: Path) -> FileResponse:
    suffix = file_path.suffix.lower()
    media_type = "image/jpeg"
    if suffix == ".png":
        media_type = "image/png"
    elif suffix == ".webp":
        media_type = "image/webp"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600"
        }
    )

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

# Static frontend serving (unified single-service deployment)
frontend_static = Path(__file__).resolve().parent.parent / "static"
if not frontend_static.exists():
    frontend_static = BASE_DIR / "static"
if not frontend_static.exists():
    frontend_static = BASE_DIR.parent / "frontend" / "dist"

logger.info(f"Frontend static directory: {frontend_static} (exists: {frontend_static.exists()})")

assets_dir = frontend_static / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

@app.get("/")
async def serve_root():
    index_file = frontend_static / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    return {"message": "PlantCare API is running. Static files are preparing.", "status": "healthy"}

@app.get("/{full_path:path}")
async def serve_frontend_spa(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("uploads/") or full_path in ("docs", "openapi.json", "redoc"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    target_file = frontend_static / full_path
    if full_path and target_file.is_file():
        return FileResponse(str(target_file))
    index_file = frontend_static / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")


