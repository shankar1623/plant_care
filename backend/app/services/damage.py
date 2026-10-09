import cv2
import numpy as np
from PIL import Image
from pathlib import Path
import uuid

def calculate_leaf_damage(image_path: Path, output_dir: Path) -> tuple[float, str]:
    """
    Analyzes a leaf image using HSV color thresholding:
    1. Identifies full leaf area (green, yellow, necrotic tones)
    2. Identifies diseased/damaged lesion areas (brown spots, yellowing halos, necrotic patches)
    3. Calculates damage percentage: (lesion_area / leaf_area) * 100
    4. Generates an annotated visualization with lesion outlines drawn
    
    Returns:
        (damage_percent, annotated_image_filename)
    """
    image = cv2.imread(str(image_path))
    if image is None:
        # Fallback if image cannot be read directly by OpenCV
        pil_img = Image.open(image_path).convert('RGB')
        image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # 1. Segment the leaf body:
    # Captures healthy greens as well as stressed yellow/brown leaf tissue
    lower_leaf = np.array([10, 25, 25])
    upper_leaf = np.array([95, 255, 255])
    leaf_mask = cv2.inRange(hsv, lower_leaf, upper_leaf)

    # Clean morphological noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_CLOSE, kernel)
    leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_OPEN, kernel)

    leaf_pixels = cv2.countNonZero(leaf_mask)
    if leaf_pixels == 0:
        # If mask is empty, take whole image area as fallback
        leaf_pixels = image.shape[0] * image.shape[1]
        leaf_mask = np.ones((image.shape[0], image.shape[1]), dtype=np.uint8) * 255

    # 2. Segment diseased lesions (brown spots, dark necrotic rings, yellow chlorosis)
    # Range 1: Brown & necrotic spots
    lower_brown = np.array([5, 40, 20])
    upper_brown = np.array([25, 255, 180])
    brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)

    # Range 2: Stressed chlorotic yellowing
    lower_yellow = np.array([20, 70, 70])
    upper_yellow = np.array([35, 255, 255])
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    # Combined diseased lesion mask within the leaf boundary
    lesion_mask = cv2.bitwise_or(brown_mask, yellow_mask)
    lesion_mask = cv2.bitwise_and(lesion_mask, leaf_mask)
    lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_OPEN, kernel)

    lesion_pixels = cv2.countNonZero(lesion_mask)

    damage_percent = round((lesion_pixels / float(leaf_pixels)) * 100.0, 1)
    # Clamp between 0.0% and 100.0%
    damage_percent = min(100.0, max(0.0, damage_percent))

    # 3. Create annotated visualization image
    annotated = image.copy()
    contours, _ = cv2.findContours(lesion_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # Draw lesion boundaries in vibrant amber/red
    cv2.drawContours(annotated, contours, -1, (0, 0, 230), 2)

    # Add overlay blend for visual highlighting
    overlay = annotated.copy()
    overlay[lesion_mask > 0] = [0, 69, 255] # Orange-red tint
    cv2.addWeighted(overlay, 0.35, annotated, 0.65, 0, annotated)

    annotated_filename = f"annotated_{uuid.uuid4().hex[:10]}.jpg"
    annotated_path = output_dir / annotated_filename
    cv2.imwrite(str(annotated_path), annotated)

    return damage_percent, annotated_filename

