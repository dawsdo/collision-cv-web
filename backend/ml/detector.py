from ultralytics import YOLO


class YOLODetector:
    def __init__(self, model_path: str):
        self.model = YOLO(model_path)

    def detect(self, image) -> list[dict]:
        # TODO: run inference and parse results into detection dicts
        return []
