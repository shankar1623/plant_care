from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Detection Schemas ---
class MedicineDetail(BaseModel):
    name: str
    dosage: Optional[str] = None
    spray_interval: Optional[str] = None
    spray_time: Optional[str] = None
    precautions: Optional[str] = None

class DetectionResponse(BaseModel):
    id: Optional[int] = None
    image_url: str
    annotated_image_url: str
    plant_name: str
    disease_name: str
    raw_class: str
    damage_percent: float
    confidence: float
    is_healthy: bool
    primary_medicine: MedicineDetail
    backup_medicine: Optional[MedicineDetail] = None

# --- Treatment Schemas ---
class CheckinResponse(BaseModel):
    id: int
    day_number: int
    image_url: str
    damage_percent: float
    status_message: str
    medicine_prescribed: str
    switch_occurred: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TreatmentPlanResponse(BaseModel):
    id: int
    plant_name: str
    disease_name: str
    current_medicine: str
    status: str
    initial_damage: float
    latest_damage: float
    created_at: datetime
    checkins: List[CheckinResponse] = []

    class Config:
        from_attributes = True

class CheckinUploadRequest(BaseModel):
    treatment_id: int
    day_number: Optional[int] = None # Auto-computed if omitted

# --- Chat Schemas ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    plant_name: Optional[str] = None
    disease_name: Optional[str] = None
    current_medicine: Optional[str] = None
    language: str = "en"
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    language: str

# --- Outbreak Schemas ---
class OutbreakAlertResponse(BaseModel):
    disease_name: str
    plant_name: str
    risk_level: str
    affected_farms_count: int
    closest_farm_km: float
    radius_km: float
    window_days: Optional[int] = 7
    sample_image_url: Optional[str] = None
    preventive_medicine: str
    message: str


