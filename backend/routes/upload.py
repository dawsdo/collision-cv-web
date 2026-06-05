from flask import Blueprint, request, jsonify

upload_bp = Blueprint("upload", __name__)


@upload_bp.post("/api/upload")
def upload():
    file = request.files.get("file")
    filename = file.filename if file else None
    return jsonify({"status": "received", "filename": filename})
