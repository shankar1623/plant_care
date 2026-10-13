from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.config import settings
from app.auth import get_current_user_id
from app.models import Diagnosis, OutbreakReport
from app.services.predictor import get_predictor
from app.services.damage import calculate_leaf_damage, reconcile_damage_with_prediction
from app.services.plant_validator import validate_plant_image
from app.services.image_security import validate_and_save_upload, cleanup_files
from app.schemas import DetectionResponse

logger = logging.getLogger("plantcare.detect")

router = APIRouter(prefix="/api/detect", tags=["Detection"])

@router.post("", response_model=DetectionResponse)
async def detect_leaf_disease(
    file: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    saved_path = None
    annotated_path = None

    try:
        # 1. Enforce file size limit, real image validation, and generate safe filename
        saved_path, unique_name = validate_and_save_upload(file, prefix="scan")

        # 2. Validate that the image contains an actual plant leaf/crop
        is_plant, val_msg = validate_plant_image(saved_path)
        if not is_plant:
            cleanup_files(saved_path)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=val_msg)

        # 3. Run ML classification via model.h5 (Disease Prediction)
        predictor = get_predictor()
        try:
            pred_result = predictor.predict(saved_path)
        except Exception as e:
            logger.error(f"Prediction failure: {e}")
            cleanup_files(saved_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Plant disease inference failed: {e}"
            )

        # 4. Run leaf damage segmentation (Damage Estimation)
        raw_damage, annotated_filename = calculate_leaf_damage(saved_path, settings.UPLOAD_DIR)
        annotated_path = settings.UPLOAD_DIR / annotated_filename

        # 5. Separate disease prediction from damage estimation and reconcile conflicting results
        reconciliation = reconcile_damage_with_prediction(
            raw_damage=raw_damage,
            is_healthy=pred_result["is_healthy"],
            disease_name=pred_result["disease_name"],
            confidence=pred_result["confidence"]
        )
        damage_percent = reconciliation["damage_percent"]

        image_url = f"/uploads/{unique_name}"
        annotated_url = f"/uploads/{annotated_filename}"

        # 6. Save diagnosis in database
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

        # 7. If diseased and GPS coordinates present, log into OutbreakReports for the 30km proximity radar
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

    except HTTPException:
        cleanup_files(saved_path, annotated_path)
        raise
    except Exception as e:
        db.rollback()
        cleanup_files(saved_path, annotated_path)
        logger.error(f"Unexpected error during leaf disease detection: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the scan: {e}"
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
