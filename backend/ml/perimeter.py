import math

# Proximity thresholds — both in IMAGE SPACE (pixels), not real-world distance.
# Objects farther from the camera appear smaller and closer together in pixel
# space, so these thresholds do not correspond to a fixed physical distance.
# Tune to the expected object sizes and scene depth for a given camera setup.
PROXIMITY_DISTANCE_PX = 200  # center-to-center Euclidean distance that flags a pair
PROXIMITY_GAP_PX = 20        # nearest-edge gap; 0 when boxes touch, negative when they overlap


def _center(bbox: list) -> tuple[float, float]:
    """Return the center point of a [x1, y1, x2, y2] box."""
    x1, y1, x2, y2 = bbox
    return (x1 + x2) / 2.0, (y1 + y2) / 2.0


def _box_gap(bbox_a: list, bbox_b: list) -> float:
    """
    Euclidean distance between the nearest edges of two axis-aligned boxes.
    Returns 0 when the boxes touch or overlap (i.e. gap ≤ 0 is clamped to 0).

    How it works:
      dx = horizontal separation between the boxes (0 if they overlap horizontally)
      dy = vertical separation between the boxes (0 if they overlap vertically)
      gap = sqrt(dx² + dy²)  — distance to the nearest corner pair
    """
    x1_a, y1_a, x2_a, y2_a = bbox_a
    x1_b, y1_b, x2_b, y2_b = bbox_b

    dx = max(0.0, max(x1_a, x1_b) - min(x2_a, x2_b))
    dy = max(0.0, max(y1_a, y1_b) - min(y2_a, y2_b))

    return math.sqrt(dx * dx + dy * dy)


def compute_proximity_pairs(tracked: list[dict]) -> list[dict]:
    """
    Compare every pair of currently-tracked objects and return those that are close.

    Inputs: tracked — list of dicts with keys 'id', 'bbox' ([x1,y1,x2,y2]), 'class'.
    Returns: list of close pairs only (is_close=True); far pairs are discarded.

    Each returned pair contains:
      id_a, id_b          — the track ids of the two objects
      center_distance     — Euclidean distance between box centers, in pixels
      box_gap             — distance between nearest edges, in pixels (0 = touching/overlapping)
      is_close            — True when center_distance < PROXIMITY_DISTANCE_PX
                            OR box_gap < PROXIMITY_GAP_PX

    Image-space limitation: pixel proximity ≠ physical proximity. A car far from
    the camera appears small; two such cars can have a small pixel gap but be
    physically metres apart. This layer detects 2D image-space closeness only.
    """
    close_pairs = []
    n = len(tracked)

    for i in range(n):
        for j in range(i + 1, n):
            a = tracked[i]
            b = tracked[j]

            cx_a, cy_a = _center(a["bbox"])
            cx_b, cy_b = _center(b["bbox"])
            center_dist = math.sqrt((cx_a - cx_b) ** 2 + (cy_a - cy_b) ** 2)

            gap = _box_gap(a["bbox"], b["bbox"])

            # Flag when either measure crosses its threshold; both capture
            # different situations (large trucks have wide-spaced centers
            # but nearly-touching edges, for example).
            if center_dist < PROXIMITY_DISTANCE_PX or gap < PROXIMITY_GAP_PX:
                close_pairs.append({
                    "id_a": a["id"],
                    "id_b": b["id"],
                    "center_distance": round(center_dist, 2),
                    "box_gap": round(gap, 2),
                    "is_close": True,
                })

    return close_pairs
