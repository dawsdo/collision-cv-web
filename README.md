# Collision CV Web

A real-time multi-class object detection web app. A Python/Flask backend runs YOLOv8 inference and streams results over WebSockets; a React frontend renders live bounding-box overlays for uploaded images, uploaded videos, and live webcam feeds.

## Features

**Three input paths — all running real YOLOv8 (`yolov8s.pt`) inference:**

- **Image upload** — drag or select a JPG or PNG; `POST /api/upload` returns bounding boxes and image dimensions.
- **Video upload** — MP4, MOV, or WebM up to 60 seconds; the backend samples ~3 frames per second and returns per-timestamp detections for the full clip.
- **Live webcam** — the browser captures frames at ~10 fps, sends them over Socket.IO, and the server decodes and runs detection in real time, returning boxes as they arrive.

Detected classes: person, bicycle, car, motorcycle, bus, truck (confidence threshold: 0.4).

**Live mode details:**

- Skip-if-busy backpressure: while a frame is in flight, newly captured frames are dropped rather than queued, keeping end-to-end latency bounded to one inference cycle.
- Live stats in the UI: capture fps, detection fps, round-trip latency, and dropped frame count.
- Camera-permission error handling (denied, not found, in-use-by-another-app).

## Tech Stack

**Backend:** Python, Flask, Flask-SocketIO, Flask-CORS, ultralytics (YOLOv8), OpenCV, NumPy

**Frontend:** React 19, Vite, TypeScript, socket.io-client, Framer Motion

**API surface:**
- `GET /api/health` — liveness check
- `POST /api/upload` — image or video detection
- Socket.IO events: `frame` (client → server), `detections` / `detection_error` (server → client)

## Running Locally

**Prerequisites:** Python 3.10+, Node 18+. Model weights (`yolov8s.pt`) are included in the repo. `backend/venv` and `frontend/node_modules` are expected to exist (see setup below if they don't).

**First-time setup:**

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

```bash
# Frontend
cd frontend
npm install
```

**Running (two terminals):**

```bash
# Terminal 1 — backend on :5000
cd backend
venv\Scripts\activate
python app.py
```

```bash
# Terminal 2 — frontend on :5173
cd frontend
npm run dev
```

Open `http://localhost:5173`. The backend status indicator in the header confirms the connection.

> First inference after startup is slower due to model warm-up. Detection speed in live mode depends on hardware — the app degrades gracefully by dropping frames rather than building a queue.

## Roadmap

**Collision / perimeter analysis — not yet implemented.**

`backend/ml/perimeter.py` is currently a stub. The app does per-frame object detection; cross-frame tracking, proximity analysis, and collision perimeter logic are the planned next phase. The project name reflects this intended direction.

Other planned work:
- Real test coverage (current tests are placeholder)
- Deployment configuration (currently localhost-only over HTTP)
