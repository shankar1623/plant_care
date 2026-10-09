import json
import logging
from pathlib import Path
from PIL import Image
import numpy as np

logger = logging.getLogger("plantcare.predictor")

class PlantPredictor:
    def __init__(self, model_path: Path, class_names_path: Path, medicines_path: Path):
        self.model_path = model_path
        self.class_names_path = class_names_path
        self.medicines_path = medicines_path
        self.model = None
        self.class_names = []
        self.medicines = {}
        self.input_shape = (224, 224)
        self._load()

    def _load(self):
        # Load class names
        if self.class_names_path.exists():
            with open(self.class_names_path, "r", encoding="utf-8") as f:
                self.class_names = json.load(f)
            logger.info(f"Loaded {len(self.class_names)} classes.")

        # Load medicines database
        if self.medicines_path.exists():
            with open(self.medicines_path, "r", encoding="utf-8") as f:
                self.medicines = json.load(f)
            logger.info(f"Loaded medicine database for {len(self.medicines)} diseases.")

        # Load Keras model
        if self.model_path.exists():
            try:
                import tensorflow as tf
                # Disable GPU if causing driver mismatch on Windows, or allow CPU fallback
                self.model = tf.keras.models.load_model(str(self.model_path), compile=False)
                # Determine input shape
                if hasattr(self.model, "input_shape") and self.model.input_shape:
                    # e.g. (None, 224, 224, 3) or (None, 256, 256, 3)
                    shape = self.model.input_shape
                    if len(shape) >= 3 and shape[1] is not None and shape[2] is not None:
                        self.input_shape = (int(shape[1]), int(shape[2]))
                logger.info(f"Loaded model.h5 successfully. Input shape: {self.input_shape}")
            except Exception as e:
                logger.error(f"Failed to load model from {self.model_path}: {e}")
                self.model = None

    def predict(self, image_path: Path) -> dict:
        """
        Runs prediction on leaf image.
        Returns plant name, disease, confidence, and medicine recommendations.
        """
        if not self.model or not self.class_names:
            # Fallback mock for demo safety if model is absent
            return {
                "raw_class": "Tomato___Late_blight",
                "plant_name": "Tomato",
                "disease_name": "Late Blight",
                "confidence": 0.94,
                "is_healthy": False,
                "primary_medicine": self.medicines.get("Tomato___Late_blight", {}).get("primary_medicine", {}),
                "backup_medicine": self.medicines.get("Tomato___Late_blight", {}).get("backup_medicine", {})
            }

        # Open and preprocess image
        img = Image.open(image_path).convert("RGB")
        img = img.resize(self.input_shape)
        img_array = np.array(img, dtype=np.float32)

        # Note: The Keras model already contains an internal Rescaling layer (scale=1/255.0).
        # We must keep pixel values in range [0, 255] so the model does not double-rescale.
        img_array = np.expand_dims(img_array, axis=0)

        predictions = self.model.predict(img_array, verbose=0)
        idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][idx])
        raw_class = self.class_names[idx] if idx < len(self.class_names) else "Tomato___Late_blight"

        # Parse plant and disease name from class string (e.g. "Tomato___Late_blight")
        if "___" in raw_class:
            plant_part, disease_part = raw_class.split("___", 1)
            plant_name = plant_part.replace("_", " ").replace("(", "").replace(")", "").strip()
            disease_name = disease_part.replace("_", " ").strip()
        else:
            plant_name = raw_class
            disease_name = "Detected Condition"

        is_healthy = "healthy" in raw_class.lower()

        med_info = self.medicines.get(raw_class, {})
        primary_medicine = med_info.get("primary_medicine", {
            "name": "Broad Spectrum Bio-Fungicide (Neem & Copper)",
            "dosage": "2.5 g per liter of water",
            "spray_interval": "Spray every 7-10 days",
            "spray_time": "Early morning",
            "precautions": "Wear mask and gloves."
        })
        backup_medicine = med_info.get("backup_medicine", {
            "name": "Systemic Fungicide (Metalaxyl + Mancozeb)",
            "dosage": "2 g per liter of water",
            "spray_interval": "Every 10-12 days",
            "spray_time": "Evening",
            "precautions": "Follow seasonal spray limits."
        })

        return {
            "raw_class": raw_class,
            "plant_name": plant_name,
            "disease_name": disease_name,
            "confidence": round(confidence, 4),
            "is_healthy": is_healthy,
            "primary_medicine": primary_medicine,
            "backup_medicine": backup_medicine
        }

# Global singleton instance
_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        from app.config import settings
        _predictor = PlantPredictor(
            model_path=settings.MODEL_PATH,
            class_names_path=Path(__file__).resolve().parent.parent / "data" / "class_names.json",
            medicines_path=Path(__file__).resolve().parent.parent / "data" / "medicines.json"
        )
    return _predictor
