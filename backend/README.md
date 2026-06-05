# Backend — Setup & Development

## Prerequisites

- Python 3.10+
- `pip` and `venv`

## Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running

```bash
python app.py
```

The server starts on `http://localhost:5000`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/upload` | Upload a video frame or file |
| WS | `/ws/stream` | WebSocket stream for real-time detections |

## Running Tests

```bash
pytest tests/
```

## Project Layout

```
backend/
├── app.py              # Flask entry point
├── requirements.txt
├── ml/
│   ├── detector.py     # YOLOv8 wrapper
│   └── perimeter.py    # Collision perimeter logic
├── routes/
│   ├── upload.py       # POST /api/upload
│   └── stream.py       # WebSocket handlers
└── tests/
    └── test_detector.py
```
