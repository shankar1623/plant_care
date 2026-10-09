import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import OutbreakReport
from app.config import settings

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates using Haversine formula in km.
    """
    R = 6371.0  # Earth's radius in kilometers
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def find_active_outbreaks(
    db: Session,
    user_lat: float,
    user_lon: float,
    radius_km: float = 30.0,
    window_days: int = 7
) -> list[dict]:
    """
    Scans recent outbreak reports within window_days (strictly 7 days).
    Groups reports by the tuple (plant_name, disease_name).
    If 3 or more reports from distinct users fall within radius_km (strictly 30 km),
    identifies it as an active outbreak alert.
    Reports older than 7 days or beyond 30 km are automatically excluded.
    """
    cutoff = datetime.utcnow() - timedelta(days=window_days)
    reports = db.query(OutbreakReport).filter(OutbreakReport.created_at >= cutoff).all()

    # Group reports by tuple (plant_name, disease_name)
    by_plant_disease: dict[tuple[str, str], list[OutbreakReport]] = {}
    for r in reports:
        if r.latitude is None or r.longitude is None:
            continue
        key = (r.plant_name, r.disease_name)
        by_plant_disease.setdefault(key, []).append(r)

    alerts = []
    for (plant_name, disease_name), group in by_plant_disease.items():
        # Check how many are strictly within user's radius (<= 30km)
        nearby_reports = []
        for r in group:
            dist = haversine_distance_km(user_lat, user_lon, r.latitude, r.longitude)
            if dist <= radius_km:
                nearby_reports.append((dist, r))

        # Check distinct users: MUST be 3 or more DIFFERENT users/accounts
        distinct_users = set()
        unique_user_reports = []
        for dist, r in nearby_reports:
            uid = r.user_id
            if uid and uid not in distinct_users:
                distinct_users.add(uid)
                unique_user_reports.append((dist, r))

        # Outbreak alert triggers ONLY when 3 or more DIFFERENT users report the same plant+disease within 7 days and 30km
        min_reports = getattr(settings, "OUTBREAK_MIN_REPORTS", 3)
        if len(distinct_users) >= min_reports:
            unique_user_reports.sort(key=lambda x: x[0])
            closest_dist = round(unique_user_reports[0][0], 1)
            farthest_dist = round(unique_user_reports[-1][0], 1)
            sample_report = unique_user_reports[0][1]

            alerts.append({
                "disease_name": disease_name,
                "plant_name": plant_name,
                "risk_level": "HIGH",
                "affected_farms_count": len(distinct_users),
                "closest_farm_km": closest_dist,
                "radius_km": radius_km,
                "window_days": window_days,
                "sample_image_url": sample_report.image_url,
                "preventive_medicine": sample_report.medicine_recommendation or "Preventive copper-based spray",
                "message": f"CRITICAL: {len(distinct_users)} different farms within {closest_dist}-{farthest_dist} km reported {plant_name} — {disease_name} in the last {window_days} days. Spray preventive medicine immediately."
            })

    return alerts

