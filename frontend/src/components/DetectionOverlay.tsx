import type { Detection } from '../types/detections'
import { getClassColor } from '../lib/classColors'

type Props = {
  imageUrl: string
  width: number
  height: number
  detections: Detection[]
}

interface LabelRect {
  x: number
  y: number
  width: number
  height: number
}

function rectIntersect(a: LabelRect, b: LabelRect): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)
}

export default function DetectionOverlay({ imageUrl, width, height, detections }: Props) {
  const fontSize = Math.max(height * 0.0175, 10)
  const padding = 3
  const labelHeight = fontSize + padding * 2

  const placedLabels: LabelRect[] = []

  return (
    <div className="detection-container">
      <img src={imageUrl} alt="Uploaded" style={{ width: '100%', display: 'block' }} />
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {detections.map((det, i) => {
          const [x1, y1, x2, y2] = det.bbox
          const color = getClassColor(det.class)
          const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`
          const labelWidth = label.length * fontSize * 0.6 + padding * 2

          // Default: label sits above box with bottom edge at bbox top.
          // Fallback: render inside when bbox top is too close to the image edge.
          const preferAbove = y1 >= labelHeight + 4
          let candidate: LabelRect = {
            x: x1,
            y: preferAbove ? y1 - labelHeight : y1,
            width: labelWidth,
            height: labelHeight,
          }

          // Nudge down until the label clears all previously placed labels.
          while (placedLabels.some(placed => rectIntersect(candidate, placed))) {
            candidate = { ...candidate, y: candidate.y + labelHeight + 2 }
          }
          placedLabels.push(candidate)

          return (
            <g key={i}>
              <rect
                x={x1}
                y={y1}
                width={x2 - x1}
                height={y2 - y1}
                stroke={color}
                strokeWidth={3}
                fill="none"
              />
              <rect
                x={candidate.x}
                y={candidate.y}
                width={candidate.width}
                height={candidate.height}
                fill={color}
              />
              <text
                x={candidate.x + padding}
                y={candidate.y + fontSize + padding}
                fill="white"
                fontSize={fontSize}
                fontFamily="sans-serif"
                fontWeight="600"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
