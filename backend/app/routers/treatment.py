import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.auth import get_current_user_id
from app.models import TreatmentPlan, TreatmentCheckin, Diagnosis
from app.services.predictor import get_predictor
from app.services.damage import calculate_leaf_damage
from app.services.compare import evaluate_treatment_progress
from app.services.plant_validator import validate_plant_image
from app.schemas import TreatmentPlanResponse

router = APIRouter(prefix="/api/treatment", tags=["Treatment Loop"])

@router.post("/start", response_model=TreatmentPlanResponse)
async def start_treatment_plan(
    diagnosis_id: int = Form(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    diag = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id, Diagnosis.user_id == user_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnosis not found.")

    # Create new treatment plan
    plan = TreatmentPlan(
        user_id=user_id,
        plant_name=diag.plant_name,
        disease_name=diag.disease_name,
        current_medicine=diag.medicine_name,
        status="IN_PROGRESS",
        initial_damage=diag.damage_percent,
        latest_damage=diag.damage_percent
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    # Create Day 0 baseline checkin
    day0 = TreatmentCheckin(
        treatment_id=plan.id,
        day_number=0,
        image_url=diag.image_url,
        damage_percent=diag.damage_percent,
        status_message="Baseline diagnosis established",
        medicine_prescribed=diag.medicine_name,
        switch_occurred=False
    )
    db.add(day0)
    db.commit()
    db.refresh(plan)

    return plan

@router.post("/checkin", response_model=TreatmentPlanResponse)
async def upload_treatment_checkin(
    treatment_id: int = Form(...),
    file: UploadFile = File(...),
    day_number: int | None = Form(None),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    plan = db.query(TreatmentPlan).filter(TreatmentPlan.id == treatment_id, TreatmentPlan.user_id == user_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found.")

    # Save uploaded follow-up image
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_name = f"checkin_{uuid.uuid4().hex[:12]}{file_ext}"
    saved_path = settings.UPLOAD_DIR / unique_name

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Validate that the follow-up photo contains an actual plant leaf/crop
    is_plant, val_msg = validate_plant_image(saved_path)
    if not is_plant:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=val_msg)

    # 1. Run damage segmentation on new photo
    damage_percent, annotated_filename = calculate_leaf_damage(saved_path, settings.UPLOAD_DIR)

    # 2. Run model classification
    predictor = get_predictor()
    pred_result = predictor.predict(saved_path)

    # Validation 1: Plant Species Verification
    # Ensure the follow-up photo belongs to the SAME crop/plant species being treated
    plan_plant = plan.plant_name.lower().strip()
    detected_plant = pred_result["plant_name"].lower().strip()
    if plan_plant != detected_plant and plan_plant not in detected_plant and detected_plant not in plan_plant:
        try:
            saved_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Plant species mismatch: This treatment plan is for {plan.plant_name}, but the uploaded photo was identified as {pred_result['plant_name']}. Please upload a photo of the same {plan.plant_name} plant."
        )

    previous_damage = plan.latest_damage

    # If leaf has no lesions or model classifies healthy, damage is 0.0% (Recovered)
    if damage_percent <= 0.0 or pred_result["is_healthy"]:
        damage_percent = 0.0

    # Determine day number: if not explicitly supplied, increment previous by 3
    if day_number is None:
        latest_checkin = plan.checkins[-1] if plan.checkins else None
        day_number = (latest_checkin.day_number + 3) if latest_checkin else 3

    # Fetch backup medicine from predictor
    backup_med_name = pred_result.get("backup_medicine", {}).get("name", "Metalaxyl 8% + Mancozeb 64% WP")

    # 3. Check past check-ins: has a medicine switch already occurred in any previous check-in (after Day 0)?
    already_switched = any(c.switch_occurred for c in plan.checkins if c.day_number > 0)

    eval_result = evaluate_treatment_progress(
        previous_damage=previous_damage,
        current_damage=damage_percent,
        current_medicine=plan.current_medicine,
        backup_medicine=backup_med_name,
        is_classified_healthy=pred_result["is_healthy"],
        already_switched=already_switched,
        day_number=day_number
    )

    # Create new check-in record
    annotated_url = f"/uploads/{annotated_filename}"
    checkin = TreatmentCheckin(
        treatment_id=plan.id,
        day_number=day_number,
        image_url=annotated_url,
        damage_percent=damage_percent,
        status_message=eval_result["message"],
        medicine_prescribed=eval_result["prescribed_medicine"],
        switch_occurred=eval_result["switch_occurred"]
    )
    db.add(checkin)

    # Update plan status & current medicine
    plan.latest_damage = damage_percent
    plan.current_medicine = eval_result["prescribed_medicine"]
    if eval_result.get("stop_loop"):
        plan.status = "STOPPED_DOCTOR_CONSULT"
    elif eval_result.get("case_completed"):
        plan.status = "RECOVERED"

    db.commit()
    db.refresh(plan)
    return plan

@router.post("/{treatment_id}/done", response_model=TreatmentPlanResponse)
async def mark_treatment_done(
    treatment_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    plan = db.query(TreatmentPlan).filter(TreatmentPlan.id == treatment_id, TreatmentPlan.user_id == user_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found.")
    plan.status = "ARCHIVED"
    db.commit()
    db.refresh(plan)
    return plan

@router.get("", response_model=list[TreatmentPlanResponse])
async def list_treatment_plans(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    plans = db.query(TreatmentPlan).filter(TreatmentPlan.user_id == user_id).order_by(TreatmentPlan.created_at.desc()).all()
    return plans

@router.get("/{plan_id}", response_model=TreatmentPlanResponse)
async def get_treatment_plan(
    plan_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    plan = db.query(TreatmentPlan).filter(TreatmentPlan.id == plan_id, TreatmentPlan.user_id == user_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found.")
    return plan
