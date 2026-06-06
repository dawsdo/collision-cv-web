from ultralytics import YOLO

# Confidence threshold: high enough to filter noise, low enough to catch partial vehicles
CONF_THRESHOLD = 0.4
DEFAULT_TARGET_CLASSES = [0, 1, 2, 3, 5, 7]  # person, bicycle, car, motorcycle, bus, truck


class YOLODetector:
    def __init__(self, model_path: str = "yolov8s.pt", target_classes: list[int] = None):
        self.model = YOLO(model_path)
        self.target_classes = target_classes if target_classes is not None else DEFAULT_TARGET_CLASSES
        self.class_names = self.model.names

    def detect(self, image) -> list[dict]:
        results = self.model.predict(image, conf=CONF_THRESHOLD, verbose=False, classes=self.target_classes)
        detections = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    "class": self.class_names[int(box.cls[0])],
                    "confidence": round(float(box.conf[0]), 4),
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                })
        return detections


_detector = None


def get_detector():
    global _detector
    if _detector is None:
        _detector = YOLODetector()
    return _detector
