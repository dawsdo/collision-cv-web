from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from routes.upload import upload_bp
from routes.stream import register_stream_handlers

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])
socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173")

app.register_blueprint(upload_bp)
register_stream_handlers(socketio)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    socketio.run(app, port=5000, debug=True)
