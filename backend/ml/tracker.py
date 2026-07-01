import numpy as np

IOU_THRESHOLD = 0.3    # minimum overlap to consider a detection a match for a track
MAX_FRAMES_MISSING = 30  # drop a track after this many consecutive frames with no match


# ---------------------------------------------------------------------------
# IoU helper (unchanged from Phase 1a)
# ---------------------------------------------------------------------------

def compute_iou(box_a: list, box_b: list) -> float:
    """Return IoU of two [x1, y1, x2, y2] boxes. Result is in [0, 1]."""
    inter_x1 = max(box_a[0], box_b[0])
    inter_y1 = max(box_a[1], box_b[1])
    inter_x2 = min(box_a[2], box_b[2])
    inter_y2 = min(box_a[3], box_b[3])

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    if inter_area == 0:
        return 0.0

    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union_area = area_a + area_b - inter_area

    return inter_area / union_area


# ---------------------------------------------------------------------------
# Box format converters
# ---------------------------------------------------------------------------

def _to_cxcywh(bbox: list) -> tuple[float, float, float, float]:
    """[x1, y1, x2, y2] → (cx, cy, w, h)"""
    x1, y1, x2, y2 = bbox
    return (x1 + x2) / 2.0, (y1 + y2) / 2.0, float(x2 - x1), float(y2 - y1)


def _to_xyxy(cx: float, cy: float, w: float, h: float) -> list:
    """(cx, cy, w, h) → [x1, y1, x2, y2] as ints, clamped ≥ 0."""
    return [
        max(0, int(cx - w / 2)),
        max(0, int(cy - h / 2)),
        max(0, int(cx + w / 2)),
        max(0, int(cy + h / 2)),
    ]


# ---------------------------------------------------------------------------
# Kalman filter for one bounding box
# ---------------------------------------------------------------------------

class KalmanBox:
    """
    Constant-velocity Kalman filter for a single bounding box.

    State vector x (6 elements):
        x[0]  cx  — horizontal center, pixels
        x[1]  cy  — vertical center, pixels
        x[2]  w   — box width, pixels
        x[3]  h   — box height, pixels
        x[4]  vx  — horizontal velocity of center, pixels per sampled frame
        x[5]  vy  — vertical velocity of center, pixels per sampled frame

    Measurement vector z (4 elements):
        z = [cx, cy, w, h]  — what YOLO reports each frame (no velocity observed)

    Two steps per frame:
      predict() — advance x by velocity, grow uncertainty P
      correct() — incorporate a new measurement, shrink P
    """

    # --- Shared matrices: built once, reused by every KalmanBox instance ---

    # State transition F: cx += vx, cy += vy, everything else constant.
    F = np.array([
        [1, 0, 0, 0, 1, 0],   # cx'  = cx + vx
        [0, 1, 0, 0, 0, 1],   # cy'  = cy + vy
        [0, 0, 1, 0, 0, 0],   # w'   = w
        [0, 0, 0, 1, 0, 0],   # h'   = h
        [0, 0, 0, 0, 1, 0],   # vx'  = vx
        [0, 0, 0, 0, 0, 1],   # vy'  = vy
    ], dtype=float)

    # Measurement matrix H: extracts [cx, cy, w, h] from the 6D state.
    # np.eye(4, 6) produces a 4×6 identity-like matrix — first 4 columns are I4.
    H = np.eye(4, 6)

    # Process noise Q: how much the real world can deviate from the motion model
    # per frame. Velocity gets higher variance because objects accelerate.
    Q = np.diag([2., 2., 2., 2., 25., 25.])

    # Measurement noise R: uncertainty in YOLO's reported box coordinates.
    # Smaller values = more trust in the detector.
    R = np.diag([5., 5., 10., 10.])

    _I6 = np.eye(6)  # identity, used in the correct step

    def __init__(self, bbox: list):
        cx, cy, w, h = _to_cxcywh(bbox)
        # Start from the first detection; assume the object is initially still.
        self.x = np.array([cx, cy, w, h, 0.0, 0.0])
        # High velocity uncertainty at init (we have no history yet), low position
        # uncertainty (we just observed it).
        self.P = np.diag([10., 10., 10., 10., 1000., 1000.])

    def predict(self):
        """
        Predict step: project state one frame forward using the motion model.
        cx and cy advance by vx/vy; covariance P grows by process noise Q.
        This is the 'coast' step — the track moves even with no new detection.
        """
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q

    def correct(self, bbox: list):
        """
        Update step: blend the prediction with a new YOLO measurement.

        The Kalman gain K determines the blend:
          - K near 1 → trust the measurement (prediction was uncertain)
          - K near 0 → trust the prediction (measurement is noisy)

        After this call, x holds the smoothed estimate and P shrinks.
        """
        cx, cy, w, h = _to_cxcywh(bbox)
        z = np.array([cx, cy, w, h])

        # Innovation: how far the measurement is from what we predicted
        y = z - self.H @ self.x

        # Innovation covariance: uncertainty of the innovation signal
        S = self.H @ self.P @ self.H.T + self.R

        # Kalman gain: optimal weighting of prediction vs. measurement
        K = self.P @ self.H.T @ np.linalg.inv(S)

        # Fuse: nudge x toward the measurement, proportional to K
        self.x = self.x + K @ y

        # Shrink uncertainty now that we have new information
        self.P = (self._I6 - K @ self.H) @ self.P

    def to_bbox(self) -> list:
        """Return the current state estimate as [x1, y1, x2, y2]."""
        return _to_xyxy(self.x[0], self.x[1], self.x[2], self.x[3])


# ---------------------------------------------------------------------------
# Track: one persistent object identity
# ---------------------------------------------------------------------------

class Track:
    def __init__(self, track_id: int, detection: dict):
        self.id = track_id
        self.class_name = detection["class"]
        self.frames_since_seen = 0
        self.kf = KalmanBox(detection["bbox"])

    def predict(self):
        """Advance the Kalman filter one frame (called before matching)."""
        self.kf.predict()

    def correct(self, detection: dict):
        """Fuse a matched detection into the Kalman filter."""
        self.kf.correct(detection["bbox"])
        self.class_name = detection["class"]
        self.frames_since_seen = 0

    @property
    def bbox(self) -> list:
        """Kalman-estimated box in [x1, y1, x2, y2], used for IoU matching."""
        return self.kf.to_bbox()

    @property
    def vx(self) -> float:
        """Estimated horizontal velocity in pixels per sampled frame."""
        return float(self.kf.x[4])

    @property
    def vy(self) -> float:
        """Estimated vertical velocity in pixels per sampled frame."""
        return float(self.kf.x[5])


# ---------------------------------------------------------------------------
# Tracker: manages the set of active tracks across frames
# ---------------------------------------------------------------------------

class IoUTracker:
    """
    Per-frame IoU tracker with Kalman filter motion prediction.
    Call update() once per frame in temporal order.
    Returns detections annotated with stable 'id' fields and smoothed boxes.
    """

    def __init__(self):
        self._tracks: list[Track] = []
        self._next_id = 1

    def update(self, detections: list[dict]) -> list[dict]:
        """
        Four-phase update: predict → match → correct → age/spawn.

        1. Predict  — advance every track's Kalman state by one frame so the
                      matching uses where we expect objects to be, not where they
                      were last seen.
        2. Match    — score each (track, detection) pair by IoU of the predicted
                      box against the raw YOLO box. Greedily assign best matches
                      first; each side used at most once.
        3. Correct  — update matched tracks' Kalman filters with the measurement.
                      Unmatched tracks keep their predicted (coasting) state so
                      they can re-match if the object reappears.
        4. Age/spawn — increment frames_since_seen for unmatched tracks; drop any
                       that exceed MAX_FRAMES_MISSING. Spawn new tracks for
                       detections that matched nothing.
        """
        # --- 1. Predict ---
        for track in self._tracks:
            track.predict()

        existing_tracks = list(self._tracks)

        # --- 2. Match: predicted boxes vs. raw YOLO boxes ---
        candidates = []
        for t_idx, track in enumerate(existing_tracks):
            for d_idx, det in enumerate(detections):
                iou = compute_iou(track.bbox, det["bbox"])
                if iou >= IOU_THRESHOLD:
                    candidates.append((iou, t_idx, d_idx))

        candidates.sort(key=lambda x: x[0], reverse=True)

        matched_track_indices: set[int] = set()
        matched_det_indices: set[int] = set()
        det_to_track_id: dict[int, int] = {}
        det_smoothed_bbox: dict[int, list] = {}

        for iou, t_idx, d_idx in candidates:
            if t_idx in matched_track_indices or d_idx in matched_det_indices:
                continue
            track = existing_tracks[t_idx]
            # --- 3. Correct ---
            track.correct(detections[d_idx])
            matched_track_indices.add(t_idx)
            matched_det_indices.add(d_idx)
            det_to_track_id[d_idx] = track.id
            det_smoothed_bbox[d_idx] = track.bbox  # Kalman-smoothed position

        # --- 4a. Age unmatched existing tracks ---
        surviving: list[Track] = []
        for t_idx, track in enumerate(existing_tracks):
            if t_idx not in matched_track_indices:
                track.frames_since_seen += 1
            if track.frames_since_seen <= MAX_FRAMES_MISSING:
                surviving.append(track)

        # --- 4b. Spawn new tracks for unmatched detections ---
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_det_indices:
                new_track = Track(self._next_id, det)
                self._next_id += 1
                surviving.append(new_track)
                det_to_track_id[d_idx] = new_track.id
                det_smoothed_bbox[d_idx] = new_track.bbox

        self._tracks = surviving

        # Return detections annotated with id and the Kalman-smoothed box
        return [
            {**det, "id": det_to_track_id[d_idx], "bbox": det_smoothed_bbox[d_idx]}
            for d_idx, det in enumerate(detections)
        ]
