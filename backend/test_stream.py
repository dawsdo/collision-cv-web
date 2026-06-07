#!/usr/bin/env python3
"""
Send a single JPEG frame over WebSocket and print detections back.
Usage: python test_stream.py <path-to-image.jpg>
Requires: pip install "python-socketio[client]"
"""
import json
import sys

import socketio

SERVER_URL = "http://localhost:5000"
IMAGE_PATH = sys.argv[1] if len(sys.argv) > 1 else "test.jpg"

sio = socketio.Client()


@sio.on("connected")
def on_connected(data):
    print(f"[connected] sid={data['sid']}")
    with open(IMAGE_PATH, "rb") as f:
        jpeg_bytes = f.read()
    print(f"[sending] frame_id=1, {len(jpeg_bytes)} bytes from {IMAGE_PATH}")
    sio.emit("frame", {"frame": jpeg_bytes, "frame_id": 1})


@sio.on("detections")
def on_detections(data):
    print("[detections]", json.dumps(data, indent=2))
    sio.disconnect()


@sio.on("detection_error")
def on_error(data):
    print("[detection_error]", data)
    sio.disconnect()


sio.connect(SERVER_URL)
sio.wait()
