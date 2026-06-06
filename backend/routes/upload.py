import logging
import os
import tempfile

import cv2
from flask import Blueprint, jsonify, request

from ml.detector import get_detector

upload_bp = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".mp4", ".mov", ".webm"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm"}
MAX_VIDEO_SECONDS = 60


@upload_bp.post("/api/upload")
def upload():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file provided"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}), 400

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp_path = tmp.name
            file.save(tmp_path)

        detector = get_detector()

        if ext in IMAGE_EXTENSIONS:
            image = cv2.imread(tmp_path)
            height, width = image.shape[:2]
            detections = detector.detect(image)
            return jsonify({"type": "image", "detections": detections, "width": width, "height": height})

        # Video processing
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if duration > MAX_VIDEO_SECONDS:
            cap.release()
            return jsonify({"error": f"Video exceeds {MAX_VIDEO_SECONDS}s limit ({duration:.1f}s)"}), 400

        frame_interval = int(fps)  # sample 1 frame per second
        frames = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % frame_interval == 0:
                timestamp = frame_idx / fps
                detections = detector.detect(frame)
                frames.append({"timestamp": round(timestamp, 3), "detections": detections})
            frame_idx += 1

        cap.release()
        return jsonify({"type": "video", "frames": frames, "duration": round(duration, 3), "width": width, "height": height})

    except Exception as exc:
        logging.exception("Upload processing failed")
        return jsonify({"error": f"Processing failed: {type(exc).__name__}"}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
