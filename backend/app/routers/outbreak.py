from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user_id
from app.models import OutbreakReport
from app.services.outbreak_rules import find_active_outbreaks
from app.schemas import OutbreakAlertResponse
from app.config import settings

router = APIRouter(prefix="/api/outbreak", tags=["Outbreak Radar"])

@router.get("/alerts", response_model=list[OutbreakAlertResponse])
async def get_outbreak_alerts(
    latitude: float = Query(11.6643, description="User farm latitude"),
    longitude: float = Query(78.1460, description="User farm longitude"),
    radius_km: float = Query(30.0, description="Outbreak search radius (strictly 30km)"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    alerts = find_active_outbreaks(
        db=db,
        user_lat=latitude,
        user_lon=longitude,
        radius_km=radius_km,
        window_days=settings.OUTBREAK_WINDOW_DAYS
    )
    return alerts

@router.get("/recent")
async def get_recent_reports(
    limit: int = 15,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    clamped_limit = max(1, min(50, limit))
    reports = db.query(OutbreakReport).order_by(OutbreakReport.created_at.desc()).limit(clamped_limit).all()
    return [
        {
            "plant_name": r.plant_name,
            "disease_name": r.disease_name,
            "latitude": round(r.latitude, 2) if r.latitude is not None else None,
            "longitude": round(r.longitude, 2) if r.longitude is not None else None,
            "created_at": r.created_at
        }
        for r in reports
    ]
