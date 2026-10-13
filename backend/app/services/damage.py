import cv2
import numpy as np
from PIL import Image
from pathlib import Path
import secrets
import logging

logger = logging.getLogger("plantcare.damage")

def calculate_leaf_damage(image_path: Path, output_dir: Path) -> tuple[float, str]:
    """
    Analyzes a leaf image using multi-cue computer vision:
    1. Robustly segments leaf foreground using Excess Green (ExG) and HSV saturation.
    2. Identifies necrotic, chlorotic, fungal, and rust lesion patterns.
    3. Calculates raw physical damage percentage: (lesion_area / leaf_area) * 100.
    4. Generates an annotated visualization with highlighted lesion outlines.

    Returns:
        (raw_damage_percent, annotated_image_filename)
    """
    image = cv2.imread(str(image_path))
    if image is None:
        try:
            pil_img = Image.open(image_path).convert('RGB')
            image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Failed to read image for damage calculation: {e}")
            raise RuntimeError(f"Could not load image {image_path}: {e}")

    height, width = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    b, g, r = cv2.split(image.astype(np.float32))

    # 1. Robust Leaf Segmentation:
    # Combine Excess Green Index (2G - R - B) with HSV color filtering to exclude background
    exg = 2.0 * g - r - b
    exg_norm = np.clip((exg - exg.min()) / (exg.max() - exg.min() + 1e-6) * 255, 0, 255).astype(np.uint8)

    # Broad leaf mask capturing green foliage as well as chlorotic/senescent leaf tissue
    lower_leaf = np.array([10, 20, 20])
    upper_leaf = np.array([100, 255, 255])
    hsv_leaf_mask = cv2.inRange(hsv, lower_leaf, upper_leaf)

    # Otsu threshold on vegetative index
    _, exg_mask = cv2.threshold(exg_norm, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Combine HSV mask and ExG mask
    combined_leaf_mask = cv2.bitwise_or(hsv_leaf_mask, exg_mask)

    # Morphological clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    clean_leaf_mask = cv2.morphologyEx(combined_leaf_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    clean_leaf_mask = cv2.morphologyEx(clean_leaf_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    leaf_pixels = int(cv2.countNonZero(clean_leaf_mask))
    min_expected_leaf_pixels = int(height * width * 0.05)

    if leaf_pixels < min_expected_leaf_pixels:
        # Fallback to entire image area if leaf extraction is ambiguous
        leaf_mask = np.ones((height, width), dtype=np.uint8) * 255
        leaf_pixels = height * width
    else:
        leaf_mask = clean_leaf_mask

    # 2. Multi-Symptom Lesion Detection within segmented leaf:
    # A) Necrotic / brown / dark spots (Late Blight, Early Blight, Septoria, Black Rot)
    lower_brown = np.array([5, 35, 15])
    upper_brown = np.array([25, 255, 175])
    brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)

    # B) Chlorotic / stressed yellow patches (Yellow Leaf Curl, halo spots, chlorosis)
    lower_yellow = np.array([20, 60, 60])
    upper_yellow = np.array([36, 255, 255])
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    # C) Whitish / pale powdery mildew patches (low saturation, high value within leaf)
    lower_powder = np.array([0, 0, 160])
    upper_powder = np.array([180, 45, 255])
    powder_mask = cv2.inRange(hsv, lower_powder, upper_powder)

    # D) Rust / deep orange pustules
    lower_rust = np.array([0, 100, 70])
    upper_rust = np.array([14, 255, 220])
    rust_mask = cv2.inRange(hsv, lower_rust, upper_rust)

    # Combined lesions within valid leaf boundary
    raw_lesions = cv2.bitwise_or(brown_mask, yellow_mask)
    raw_lesions = cv2.bitwise_or(raw_lesions, powder_mask)
    raw_lesions = cv2.bitwise_or(raw_lesions, rust_mask)
    lesion_mask = cv2.bitwise_and(raw_lesions, leaf_mask)

    # Filter out micro-noise
    lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_OPEN, kernel)
    lesion_pixels = int(cv2.countNonZero(lesion_mask))

    raw_damage = round((lesion_pixels / float(leaf_pixels)) * 100.0, 1)
    raw_damage = min(100.0, max(0.0, raw_damage))

    # 3. Create Annotated Visualization
    annotated = image.copy()
    contours, _ = cv2.findContours(lesion_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(annotated, contours, -1, (0, 0, 230), 2)

    overlay = annotated.copy()
    overlay[lesion_mask > 0] = [0, 69, 255]  # Orange-red highlight
    cv2.addWeighted(overlay, 0.35, annotated, 0.65, 0, annotated)

    # Safe random filename
    annotated_filename = f"annotated_{secrets.token_hex(16)}.jpg"
    annotated_path = output_dir / annotated_filename
    output_dir.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(annotated_path), annotated)

    return raw_damage, annotated_filename

def reconcile_damage_with_prediction(
    raw_damage: float,
    is_healthy: bool,
    disease_name: str = "",
    confidence: float = 0.0
) -> dict:
    """
    Separates disease classification from visual damage estimation and reconciles
    conflicting results:
    - Conflict A: Model confirms healthy plant, but color segmentation found > 0% damage
      (caused by shadows, natural leaf veins, or background dust).
      -> Resolved to 0.0% damage.
    - Conflict B: Model confirms active disease (confidence >= 0.50), but color segmentation
      reported 0% or negligible (< 1.5%) damage (e.g. early powdery mildew or subtle mosaic).
      -> Resolved to an early-stage infection baseline (5.0% - 10.0%) so user is not misled.
    - Consistent cases:
      -> Directly preserve the measured visual damage.
    """
    has_conflict = False
    conflict_type = None
    resolution_note = None
    final_damage = raw_damage

    if is_healthy:
        if raw_damage > 0.0:
            has_conflict = True
            conflict_type = "HEALTHY_WITH_FALSE_LESIONS"
            resolution_note = (
                f"Plant classified as healthy ({round(confidence * 100, 1)}% confidence). "
                f"Visual artifacts ({raw_damage}%) from natural veins or shadows resolved to 0.0%."
            )
            final_damage = 0.0
        else:
            final_damage = 0.0
    else:
        # Plant is diseased
        if raw_damage < 1.5 and confidence >= 0.50:
            has_conflict = True
            conflict_type = "DISEASED_WITH_MISSED_LESIONS"
            # Early-stage infection baseline based on model confidence
            baseline_damage = round(min(12.0, max(5.0, confidence * 8.0)), 1)
            resolution_note = (
                f"Confirmed {disease_name} infection ({round(confidence * 100, 1)}% confidence) "
                f"with subtle symptoms. Reconciled visual estimate from {raw_damage}% to "
                f"early-stage baseline {baseline_damage}%."
            )
            final_damage = baseline_damage
        else:
            final_damage = raw_damage

    final_damage = round(min(100.0, max(0.0, final_damage)), 1)

    return {
        "raw_damage": raw_damage,
        "damage_percent": final_damage,
        "has_conflict": has_conflict,
        "conflict_type": conflict_type,
        "resolution_note": resolution_note
    }

