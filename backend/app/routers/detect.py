import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.auth import get_current_user_id
from app.models import Diagnosis, OutbreakReport
from app.services.predictor import get_predictor
from app.services.damage import calculate_leaf_damage
from app.services.plant_validator import validate_plant_image
from app.schemas import DetectionResponse

router = APIRouter(prefix="/api/detect", tags=["Detection"])

@router.post("", response_model=DetectionResponse)
async def detect_leaf_disease(
    file: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    # Generate unique filename and save
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_name = f"scan_{uuid.uuid4().hex[:12]}{file_ext}"
    saved_path = settings.UPLOAD_DIR / unique_name

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Validate that the image contains an actual plant leaf/crop (and not a human, car, room, etc.)
    is_plant, val_msg = validate_plant_image(saved_path)
    if not is_plant:
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(status_code=400, detail=val_msg)

    # 1. Run ML classification via model.h5
    predictor = get_predictor()
    pred_result = predictor.predict(saved_path)

    # 2. Run leaf damage segmentation via OpenCV
    damage_percent, annotated_filename = calculate_leaf_damage(saved_path, settings.UPLOAD_DIR)

    # If model classified as healthy, clamp damage to 0.0%
    if pred_result["is_healthy"]:
        damage_percent = 0.0

    image_url = f"/uploads/{unique_name}"
    annotated_url = f"/uploads/{annotated_filename}"

    # 3. Save diagnosis in database
    diag = Diagnosis(
        user_id=user_id,
        image_url=annotated_url,
        plant_name=pred_result["plant_name"],
        disease_name=pred_result["disease_name"],
        damage_percent=damage_percent,
        medicine_name=pred_result["primary_medicine"].get("name", "Prescribed treatment"),
        is_healthy=pred_result["is_healthy"]
    )
    db.add(diag)

    # 4. If diseased and GPS coordinates present, log into OutbreakReports for the 25km proximity radar
    if not pred_result["is_healthy"] and latitude is not None and longitude is not None:
        outbreak_entry = OutbreakReport(
            user_id=user_id,
            plant_name=pred_result["plant_name"],
            disease_name=pred_result["disease_name"],
            latitude=latitude,
            longitude=longitude,
            image_url=annotated_url,
            medicine_recommendation=pred_result["primary_medicine"].get("name", "")
        )
        db.add(outbreak_entry)

    db.commit()
    db.refresh(diag)

    return DetectionResponse(
        id=diag.id,
        image_url=image_url,
        annotated_image_url=annotated_url,
        plant_name=pred_result["plant_name"],
        disease_name=pred_result["disease_name"],
        raw_class=pred_result["raw_class"],
        damage_percent=damage_percent,
        confidence=pred_result["confidence"],
        is_healthy=pred_result["is_healthy"],
        primary_medicine=pred_result["primary_medicine"],
        backup_medicine=pred_result["backup_medicine"]
    )

@router.get("/history")
async def get_scan_history(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    scans = db.query(Diagnosis).filter(Diagnosis.user_id == user_id).order_by(Diagnosis.created_at.desc()).limit(50).all()
    return [
        {
            "id": s.id,
            "plant_name": s.plant_name,
            "disease_name": s.disease_name,
            "damage_percent": s.damage_percent,
            "medicine_name": s.medicine_name,
            "is_healthy": s.is_healthy,
            "image_url": s.image_url,
            "created_at": s.created_at
        }
        for s in scans
    ]
