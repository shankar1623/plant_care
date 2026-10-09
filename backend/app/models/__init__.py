from app.database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(String(100), primary_key=True)  # Clerk user id or local id
    email = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), index=True, nullable=True)
    image_url = Column(String(500), nullable=False)
    plant_name = Column(String(100), nullable=False)
    disease_name = Column(String(150), nullable=False)
    damage_percent = Column(Float, nullable=False)
    medicine_name = Column(String(200), nullable=False)
    is_healthy = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class TreatmentPlan(Base):
    __tablename__ = "treatment_plans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), index=True, nullable=True)
    plant_name = Column(String(100), nullable=False)
    disease_name = Column(String(150), nullable=False)
    current_medicine = Column(String(200), nullable=False)
    status = Column(String(50), default="IN_PROGRESS")  # "IN_PROGRESS" or "RECOVERED"
    initial_damage = Column(Float, nullable=False)
    latest_damage = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    checkins = relationship("TreatmentCheckin", back_populates="plan", cascade="all, delete-orphan", order_by="TreatmentCheckin.day_number")

class TreatmentCheckin(Base):
    __tablename__ = "treatment_checkins"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    treatment_id = Column(Integer, ForeignKey("treatment_plans.id"), nullable=False)
    day_number = Column(Integer, nullable=False)  # 0, 3, 6, 9...
    image_url = Column(String(500), nullable=False)
    damage_percent = Column(Float, nullable=False)
    status_message = Column(String(255), nullable=False) # "Medicine is working", "Medicine is not reacting"
    medicine_prescribed = Column(String(200), nullable=False)
    switch_occurred = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("TreatmentPlan", back_populates="checkins")

class OutbreakReport(Base):
    __tablename__ = "outbreak_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), index=True, nullable=True)
    plant_name = Column(String(100), nullable=False)
    disease_name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    image_url = Column(String(500), nullable=True)
    medicine_recommendation = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
