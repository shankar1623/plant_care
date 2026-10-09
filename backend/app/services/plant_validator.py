import cv2
import numpy as np
from pathlib import Path
import logging

logger = logging.getLogger("plantcare.validator")

def validate_plant_image(image_path: Path) -> tuple[bool, str]:
    """
    Validates whether the uploaded photo actually contains a plant leaf/crop.
    Rejects:
    - Humans, selfies, portraits (skin tone detection in YCrCb)
    - Non-plant objects (vehicles, furniture, electronics, walls)
    - Dark, blurry, or low-texture photos
    
    Returns:
        (is_valid: bool, error_message: str)
    """
    try:
        img = cv2.imread(str(image_path))
        if img is None:
            return False, "Could not decode the uploaded image. Please upload a valid JPG or PNG photo."

        h, w = img.shape[:2]
        total_pixels = h * w
        if total_pixels == 0:
            return False, "Uploaded image has invalid dimensions."

        # 1. Texture & lighting quality check
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_brightness, std_texture = cv2.meanStdDev(gray)
        mean_b = float(mean_brightness[0][0])
        std_t = float(std_texture[0][0])

        if mean_b < 12.0:
            return False, "The photo is too dark. Please take a clear photo of the plant leaf in daylight or good lighting."

        if std_t < 8.0:
            return False, "The photo has no visible detail or texture. Please upload a clear, focused photo of a plant leaf."

        # 2. Human Skin Tone Detection (YCrCb Model: Cr in [133, 173], Cb in [77, 127])
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        skin_mask = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        skin_ratio = cv2.countNonZero(skin_mask) / float(total_pixels)

        # 3. Plant Foliage & Chlorophyll Tissue Detection
        # HSV spectrum for:
        # - Healthy and chlorotic greens/yellow-greens (H: 20 to 95)
        # - Necrotic and blight leaf lesions (H: 10 to 25, S: 35 to 255)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        leaf_green = cv2.inRange(hsv, np.array([20, 22, 20]), np.array([95, 255, 255]))
        leaf_brown = cv2.inRange(hsv, np.array([10, 35, 20]), np.array([25, 255, 200]))
        plant_tissue_mask = cv2.bitwise_or(leaf_green, leaf_brown)
        plant_ratio = cv2.countNonZero(plant_tissue_mask) / float(total_pixels)

        # Vegetation Excess Green Index (2*G - R - B)
        b, g, r = cv2.split(img.astype(np.float32))
        exg = 2.0 * g - r - b
        exg_ratio = float(np.mean(exg > 0))

        # Check A: Obvious Human / Person detected (e.g. self-portrait, face, clothes)
        # Only reject as human if skin tones dominate AND plant tissue is low/absent,
        # so yellowing chlorosis and necrotic blight lesions are not misidentified as skin.
        if skin_ratio > 0.35 and plant_ratio < 0.40:
            logger.info(f"Rejected human photo: skin_ratio={skin_ratio:.3f}, plant_ratio={plant_ratio:.3f}")
            return False, "No plant leaf detected! A person was detected in the photo. Please upload a photo of a plant leaf or crop."

        if skin_ratio > 0.15 and plant_ratio < 0.25:
            logger.info(f"Rejected person in frame: skin_ratio={skin_ratio:.3f}, plant_ratio={plant_ratio:.3f}")
            return False, "No plant leaf detected! A person was detected. Please upload a close-up photo of the infected plant leaf."

        # Check B: Non-plant object (electronics, wall, car, pet, pavement)
        if plant_ratio < 0.15 and exg_ratio < 0.18:
            logger.info(f"Rejected non-plant photo: plant_ratio={plant_ratio:.3f}, exg_ratio={exg_ratio:.3f}")
            return False, "No plant leaf detected! The uploaded photo does not appear to contain a crop or plant leaf. Please upload a clear photo of a leaf."

        return True, "Valid plant leaf"

    except Exception as e:
        logger.error(f"Error during plant image validation: {e}")
        # If validator encounters an unexpected format error, fail safe to allow prediction
        return True, "Validation bypassed"

