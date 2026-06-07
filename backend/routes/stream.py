import logging
import time

import cv2
import numpy as np
from flask import request
from flask_socketio import emit

from ml.detector import get_detector

logger = logging.getLogger(__name__)


def register_stream_handlers(socketio):
    @socketio.on("connect")
    def on_connect():
        logger.info("Client connected: %s", request.sid)
        emit("connected", {"sid": request.sid})

    @socketio.on("disconnect")
    def on_disconnect():
        logger.info("Client disconnected: %s", request.sid)

    @socketio.on("frame")
    def on_frame(data):
        frame_id = data.get("frame_id", -1)
        try:
            frame_bytes = data["frame"]
            np_arr = np.frombuffer(frame_bytes, dtype=np.uint8)
            image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if image is None:
                emit("detection_error", {"frame_id": frame_id, "error": "corrupt frame"})
                return

            height, width = image.shape[:2]
            detector = get_detector()

            t0 = time.perf_counter()
            detections = detector.detect(image)
            inference_time_ms = (time.perf_counter() - t0) * 1000

            emit("detections", {
                "frame_id": frame_id,
                "detections": detections,
                "width": width,
                "height": height,
                "inference_time_ms": round(inference_time_ms, 2),
            })
        except Exception as exc:
            logger.exception("Error processing frame %d", frame_id)
            emit("detection_error", {"frame_id": frame_id, "error": type(exc).__name__})
