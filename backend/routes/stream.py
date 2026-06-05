import logging

logger = logging.getLogger(__name__)


def register_stream_handlers(socketio):
    @socketio.on("connect")
    def on_connect():
        logger.info("Client connected")

    @socketio.on("disconnect")
    def on_disconnect():
        logger.info("Client disconnected")

    @socketio.on("frame")
    def on_frame(data):
        # TODO: decode frame, run detector, emit real detections
        logger.debug("Received frame (%d bytes)", len(data) if data else 0)
        socketio.emit("detection", {"detections": [], "perimeter": {"center": [0, 0], "radius": 0}})
