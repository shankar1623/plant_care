import io
from pathlib import Path
from PIL import Image
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.main import app
from app.config import settings
from app.services.predictor import PlantPredictor
from app.services.damage import calculate_leaf_damage, reconcile_damage_with_prediction
from app.services.image_security import validate_and_save_upload, cleanup_files

client = TestClient(app)

def create_test_image_bytes(format="JPEG", size=(100, 100), color=(34, 139, 34)) -> bytes:
    """Creates a valid in-memory image for testing."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()

# ==============================================================================
# 1. AUTHENTICATION VULNERABILITY TESTS
# ==============================================================================

def test_auth_dev_header_bypass_rejected_by_default(monkeypatch):
    """Ensure X-User-Id header does not bypass authentication by default."""
    monkeypatch.setattr(settings, "ALLOW_DEV_USER_HEADER", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    res = client.get("/api/detect/history", headers={"X-User-Id": "attacker_user"})
    assert res.status_code == 401
    assert "Please sign in" in res.json()["detail"]

def test_auth_dev_header_strictly_blocked_in_production(monkeypatch):
    """Ensure X-User-Id is strictly blocked in production even if ALLOW_DEV_USER_HEADER was True."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ALLOW_DEV_USER_HEADER", True)

    res = client.get("/api/detect/history", headers={"X-User-Id": "attacker_user"})
    assert res.status_code == 401
    assert "Please sign in with verified Clerk authentication" in res.json()["detail"]

# ==============================================================================
# 2. FAKE ML PREDICTIONS TESTS
# ==============================================================================

def test_predictor_raises_error_when_model_missing(tmp_path):
    """Ensure predictor raises RuntimeError instead of returning fake Tomato Late Blight."""
    empty_model_path = tmp_path / "nonexistent_model.h5"
    classes_path = tmp_path / "classes.json"
    classes_path.write_text('["Tomato___healthy"]', encoding="utf-8")
    meds_path = tmp_path / "medicines.json"
    meds_path.write_text("{}", encoding="utf-8")

    predictor = PlantPredictor(
        model_path=empty_model_path,
        class_names_path=classes_path,
        medicines_path=meds_path
    )

    test_img = tmp_path / "leaf.jpg"
    test_img.write_bytes(create_test_image_bytes())

    with pytest.raises(RuntimeError) as exc_info:
        predictor.predict(test_img)

    assert "ML model is not loaded" in str(exc_info.value)

def test_predictor_raises_error_when_classes_missing(tmp_path):
    """Ensure predictor raises error when class definitions are missing."""
    predictor = PlantPredictor(
        model_path=tmp_path / "nonexistent.h5",
        class_names_path=tmp_path / "missing_classes.json",
        medicines_path=tmp_path / "meds.json"
    )
    test_img = tmp_path / "leaf.jpg"
    test_img.write_bytes(create_test_image_bytes())

    with pytest.raises(RuntimeError) as exc_info:
        predictor.predict(test_img)

    assert "not loaded" in str(exc_info.value) or "missing or empty" in str(exc_info.value)

# ==============================================================================
# 3. DAMAGE ESTIMATION & CONFLICT RECONCILIATION TESTS
# ==============================================================================

def test_damage_reconciliation_resolves_healthy_false_positive():
    """Ensure conflict is resolved when model confirms healthy plant but color segmentation detected noise."""
    result = reconcile_damage_with_prediction(
        raw_damage=18.5,
        is_healthy=True,
        disease_name="Healthy",
        confidence=0.92
    )
    assert result["has_conflict"] is True
    assert result["damage_percent"] == 0.0
    assert result["conflict_type"] == "HEALTHY_WITH_FALSE_LESIONS"

def test_damage_reconciliation_resolves_diseased_missed_lesions():
    """Ensure conflict is resolved when active disease is confirmed with high confidence but subtle micro-lesions."""
    result = reconcile_damage_with_prediction(
        raw_damage=0.8,
        is_healthy=False,
        disease_name="Tomato Yellow Leaf Curl Virus",
        confidence=0.90
    )
    assert result["has_conflict"] is True
    assert result["damage_percent"] > 0.0
    assert result["conflict_type"] == "DISEASED_WITH_MISSED_LESIONS"

def test_damage_reconciliation_preserves_zero_lesions_on_clean_leaf():
    """Ensure a clean leaf with 0% lesions is not given artificial damage."""
    result = reconcile_damage_with_prediction(
        raw_damage=0.0,
        is_healthy=False,
        disease_name="Late Blight",
        confidence=0.65
    )
    assert result["damage_percent"] == 0.0

def test_damage_reconciliation_preserves_consistent_damage():
    """Ensure consistent damage is preserved directly when disease and lesions agree."""
    result = reconcile_damage_with_prediction(
        raw_damage=24.2,
        is_healthy=False,
        disease_name="Late Blight",
        confidence=0.95
    )
    assert result["has_conflict"] is False
    assert result["damage_percent"] == 24.2

def test_calculate_leaf_damage_execution(tmp_path):
    """Ensure leaf damage calculation executes and outputs annotated file safely."""
    test_img_path = tmp_path / "sample_leaf.jpg"
    test_img_path.write_bytes(create_test_image_bytes(size=(200, 200)))

    damage_pct, annotated_name = calculate_leaf_damage(test_img_path, tmp_path)
    assert isinstance(damage_pct, float)
    assert (tmp_path / annotated_name).exists()

# ==============================================================================
# 4. CORS CONFIGURATION TESTS
# ==============================================================================

def test_cors_does_not_contain_wildcard_with_credentials():
    """Ensure allowed origins do NOT include '*' while allow_credentials is enabled."""
    from fastapi.middleware.cors import CORSMiddleware
    cors_middleware = next(
        (m for m in app.user_middleware if m.cls == CORSMiddleware),
        None
    )
    assert cors_middleware is not None
    assert "*" not in cors_middleware.kwargs["allow_origins"]
    assert "http://localhost:5173" in cors_middleware.kwargs["allow_origins"]
    assert cors_middleware.kwargs["allow_credentials"] is True

# ==============================================================================
# 5. INSECURE IMAGE UPLOAD & PRIVACY TESTS
# ==============================================================================

def test_upload_rejects_non_image_files(monkeypatch):
    """Ensure uploading a disguised non-image file is rejected with HTTP 400."""
    monkeypatch.setattr(settings, "ALLOW_DEV_USER_HEADER", True)
    fake_file = io.BytesIO(b"<?php echo 'malicious shell'; ?>")

    res = client.post(
        "/api/detect",
        files={"file": ("exploit.php", fake_file, "image/jpeg")},
        headers={"X-User-Id": "test_user"}
    )
    assert res.status_code == 400
    assert "Invalid" in res.json()["detail"] or "Unsupported" in res.json()["detail"]

def test_upload_rejects_oversized_files(monkeypatch):
    """Ensure uploading a file exceeding max size is rejected with HTTP 413."""
    monkeypatch.setattr(settings, "ALLOW_DEV_USER_HEADER", True)
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 500)  # Low limit for testing

    oversized_data = create_test_image_bytes()
    assert len(oversized_data) > 500

    res = client.post(
        "/api/detect",
        files={"file": ("big_photo.jpg", io.BytesIO(oversized_data), "image/jpeg")},
        headers={"X-User-Id": "test_user"}
    )
    assert res.status_code == 413
    assert "File size exceeds" in res.json()["detail"]

def test_uploads_path_traversal_blocked():
    """Ensure directory traversal attacks on /uploads/{filename} are rejected."""
    res = client.get("/uploads/..%2F..%2Fmain.py")
    assert res.status_code in (400, 404)

def test_uploads_private_image_cross_user_protection(monkeypatch):
    """Ensure User A cannot view a private scan image owned by User B."""
    monkeypatch.setattr(settings, "ALLOW_DEV_USER_HEADER", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    # Create dummy image in UPLOAD_DIR
    dummy_name = "scan_test_private.jpg"
    dummy_path = settings.UPLOAD_DIR / dummy_name
    dummy_path.write_bytes(create_test_image_bytes())

    # Add diagnosis record owned by user_owner
    from app.database import SessionLocal
    from app.models import Diagnosis

    db = SessionLocal()
    try:
        diag = Diagnosis(
            user_id="user_owner",
            image_url=f"/uploads/{dummy_name}",
            plant_name="Tomato",
            disease_name="Early Blight",
            damage_percent=15.0,
            medicine_name="Bio Fungicide",
            is_healthy=False
        )
        db.add(diag)
        db.commit()

        # Attacker user tries to access user_owner's scan
        res = client.get(
            f"/uploads/{dummy_name}",
            headers={"X-User-Id": "attacker_user"}
        )
        assert res.status_code == 403
        assert "Access denied" in res.json()["detail"]

        # Owner accesses their own scan
        res_owner = client.get(
            f"/uploads/{dummy_name}",
            headers={"X-User-Id": "user_owner"}
        )
        assert res_owner.status_code == 200
        assert res_owner.headers["x-content-type-options"] == "nosniff"

    finally:
        db.query(Diagnosis).filter(Diagnosis.image_url.contains(dummy_name)).delete()
        db.commit()
        db.close()
        dummy_path.unlink(missing_ok=True)
