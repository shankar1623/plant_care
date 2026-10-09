from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user_id
from app.models import Diagnosis, TreatmentPlan, User
from app.services.outbreak_rules import find_active_outbreaks
from app.services.weather import fetch_live_weather
from app.config import settings

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    city: str | None = None

@router.post("/user/location")
async def update_user_location(
    req: LocationUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(id=user_id, latitude=req.latitude, longitude=req.longitude)
            db.add(user)
        else:
            user.latitude = req.latitude
            user.longitude = req.longitude
        db.commit()
    except Exception:
        db.rollback()

    weather = await fetch_live_weather(req.latitude, req.longitude)
    weather_city = weather.get("city")
    if weather_city and "Regional Weather" not in weather_city and "GPS" not in weather_city and "Local Farm" not in weather_city:
        resolved_city = weather_city
    elif req.city and "GPS" not in req.city and "Farm" not in req.city:
        resolved_city = req.city
    else:
        resolved_city = "Katpadi, IN"
    return {
        "status": "success",
        "user_id": user_id,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "city": resolved_city,
        "weather": weather
    }

@router.get("/stats")
async def get_dashboard_stats(
    latitude: float = 11.6643,
    longitude: float = 78.1460,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    total_scans = db.query(Diagnosis).filter(Diagnosis.user_id == user_id).count()
    healthy_count = db.query(Diagnosis).filter(Diagnosis.user_id == user_id, Diagnosis.is_healthy == True).count()
    diseased_count = db.query(Diagnosis).filter(Diagnosis.user_id == user_id, Diagnosis.is_healthy == False).count()
    active_treatments = db.query(TreatmentPlan).filter(TreatmentPlan.user_id == user_id, TreatmentPlan.status == "IN_PROGRESS").count()

    # Check active outbreaks within 30km (only triggers if >= 3 distinct users within 7 days)
    outbreak_alerts = find_active_outbreaks(db, latitude, longitude, radius_km=30.0, window_days=settings.OUTBREAK_WINDOW_DAYS)

    # Recent treatments for this user
    recent_plans = db.query(TreatmentPlan).filter(TreatmentPlan.user_id == user_id).order_by(TreatmentPlan.updated_at.desc()).limit(5).all()

    return {
        "total_scans": total_scans,
        "healthy_count": healthy_count,
        "diseased_count": diseased_count,
        "active_treatments_count": active_treatments,
        "outbreak_alerts_count": len(outbreak_alerts),
        "top_outbreak": outbreak_alerts[0] if outbreak_alerts else None,
        "recent_treatments": [
            {
                "id": p.id,
                "plant_name": p.plant_name,
                "disease_name": p.disease_name,
                "current_medicine": p.current_medicine,
                "status": p.status,
                "initial_damage": p.initial_damage,
                "latest_damage": p.latest_damage,
                "checkin_count": len(p.checkins)
            }
            for p in recent_plans
        ]
    }
