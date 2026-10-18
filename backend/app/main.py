import re
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
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

# Ensure uploads directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Initialize database tables on load
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
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
    if not re.match(r"^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp|svg)$", filename, re.IGNORECASE):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")

    upload_dir_resolved = settings.UPLOAD_DIR.resolve()
    safe_path = (settings.UPLOAD_DIR / filename).resolve()

    # If file was removed or lost on Render ephemeral container restart, serve a stylish fallback SVG
    if not safe_path.is_relative_to(upload_dir_resolved) or not safe_path.exists():
        return _serve_fallback_svg()

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
    if owner_id and current_user_id:
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
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
            "Cross-Origin-Resource-Policy": "cross-origin",
        }
    )

def _serve_fallback_svg() -> Response:
    svg_data = '''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E1A11"/>
      <stop offset="100%" stop-color="#050C07"/>
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="16" fill="url(#bg)" stroke="#1F3D24" stroke-width="2"/>
  <g transform="translate(268, 110) scale(2.6)">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="url(#leafGrad)" opacity="0.9"/>
  </g>
  <text x="300" y="245" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#E2E8F0" text-anchor="middle">PlantCare Archived Scan</text>
  <text x="300" y="275" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" fill="#6EE7B7" text-anchor="middle">Historical Record Preserved</text>
</svg>'''
    return Response(
        content=svg_data,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Cross-Origin-Resource-Policy": "cross-origin",
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


