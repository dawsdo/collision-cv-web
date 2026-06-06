import type { Detection } from '../types/detections'
import { getClassColor } from '../lib/classColors'

interface LabelRect {
  x: number
  y: number
  width: number
  height: number
}

function rectIntersect(a: LabelRect, b: LabelRect): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)
}

interface Props {
  detections: Detection[]
  imageHeight: number
}

export default function BoundingBoxLayer({ detections, imageHeight }: Props) {
  const fontSize = Math.max(imageHeight * 0.0175, 10)
  const padding = 3
  const labelHeight = fontSize + padding * 2
  const placedLabels: LabelRect[] = []

  return (
    <>
      {detections.map((det, i) => {
        const [x1, y1, x2, y2] = det.bbox
        const color = getClassColor(det.class)
        const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`
        const labelWidth = label.length * fontSize * 0.6 + padding * 2

        const preferAbove = y1 >= labelHeight + 4
        let candidate: LabelRect = {
          x: x1,
          y: preferAbove ? y1 - labelHeight : y1,
          width: labelWidth,
          height: labelHeight,
        }

        while (placedLabels.some(placed => rectIntersect(candidate, placed))) {
          candidate = { ...candidate, y: candidate.y + labelHeight + 2 }
        }
        placedLabels.push(candidate)

        return (
          <g key={i}>
            <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} stroke={color} strokeWidth={3} fill="none" />
            <rect x={candidate.x} y={candidate.y} width={candidate.width} height={candidate.height} fill={color} />
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
    </>
  )
}
