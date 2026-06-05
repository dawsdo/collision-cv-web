# Collision CV Web

A real-time computer vision web application that uses YOLOv8 object detection to identify and track collisions from a video stream. The system computes a dynamic perimeter around detected objects and streams detection results to a browser-based interface.

## Architecture

The backend is a Python Flask server (`backend/`) that handles video frame ingestion, runs YOLOv8 inference via the `ultralytics` library, and pushes detection results over WebSockets using Flask-SocketIO. The frontend (to be added) is a React + Vite app that captures webcam frames, sends them to the backend, and renders bounding boxes and perimeter overlays in real time.

## Running the Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

The API will be available at `http://localhost:5000`.

> **Note:** This project is a work in progress. The ML detection and perimeter logic are currently stubbed out.
