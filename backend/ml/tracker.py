IOU_THRESHOLD = 0.3   # minimum overlap to consider a detection a match for a track
MAX_FRAMES_MISSING = 30  # drop a track after this many consecutive frames with no match


def compute_iou(box_a: list, box_b: list) -> float:
    """Return IoU of two [x1, y1, x2, y2] boxes. Result is in [0, 1]."""
    # Intersection rectangle
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


class Track:
    def __init__(self, track_id: int, detection: dict):
        self.id = track_id
        self.bbox = detection["bbox"]
        self.class_name = detection["class"]
        self.frames_since_seen = 0


class IoUTracker:
    """
    Per-frame IoU-based tracker. Call update() once per frame in order.
    Returns the same detections augmented with a stable integer 'id' field.
    """

    def __init__(self):
        self._tracks: list[Track] = []
        self._next_id = 1

    def update(self, detections: list[dict]) -> list[dict]:
        """
        Match detections to existing tracks by IoU, assign persistent ids.

        Algorithm:
        1. Score every (track, detection) pair by IoU; keep pairs above threshold.
        2. Greedily assign, highest IoU first; each side used at most once.
        3. Matched tracks: update box/class, reset age counter.
        4. Unmatched tracks: increment age; discard if age > MAX_FRAMES_MISSING.
        5. Unmatched detections: spawn new tracks with new ids.
        6. Return detections list with an 'id' key added to each entry.
        """
        existing_tracks = list(self._tracks)

        # Build the list of viable (iou, track_idx, detection_idx) candidates
        candidates = []
        for t_idx, track in enumerate(existing_tracks):
            for d_idx, det in enumerate(detections):
                iou = compute_iou(track.bbox, det["bbox"])
                if iou >= IOU_THRESHOLD:
                    candidates.append((iou, t_idx, d_idx))

        # Sort descending so we greedily claim the best matches first
        candidates.sort(key=lambda x: x[0], reverse=True)

        matched_track_indices: set[int] = set()
        matched_det_indices: set[int] = set()
        det_to_track_id: dict[int, int] = {}

        for iou, t_idx, d_idx in candidates:
            if t_idx in matched_track_indices or d_idx in matched_det_indices:
                continue
            # Claim this match
            track = existing_tracks[t_idx]
            track.bbox = detections[d_idx]["bbox"]
            track.class_name = detections[d_idx]["class"]
            track.frames_since_seen = 0
            matched_track_indices.add(t_idx)
            matched_det_indices.add(d_idx)
            det_to_track_id[d_idx] = track.id

        # Age unmatched tracks; keep those still within the grace window
        surviving: list[Track] = []
        for t_idx, track in enumerate(existing_tracks):
            if t_idx not in matched_track_indices:
                track.frames_since_seen += 1
            if track.frames_since_seen <= MAX_FRAMES_MISSING:
                surviving.append(track)

        # Unmatched detections become new tracks
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_det_indices:
                new_track = Track(self._next_id, det)
                self._next_id += 1
                surviving.append(new_track)
                det_to_track_id[d_idx] = new_track.id

        self._tracks = surviving

        # Annotate each detection with its assigned track id and return
        return [{**det, "id": det_to_track_id[d_idx]} for d_idx, det in enumerate(detections)]
