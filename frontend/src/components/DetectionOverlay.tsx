import type { Detection } from '../types/detections'
import { getClassColor } from '../lib/classColors'

type Props = {
  imageUrl: string
  width: number
  height: number
  detections: Detection[]
}

export default function DetectionOverlay({ imageUrl, width, height, detections }: Props) {
  const fontSize = Math.max(height * 0.025, 14)
  const padding = 4
  const labelHeight = fontSize + padding * 2

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
          const labelTop = y1 >= labelHeight ? y1 - labelHeight : y1

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
                x={x1}
                y={labelTop}
                width={labelWidth}
                height={labelHeight}
                fill={color}
              />
              <text
                x={x1 + padding}
                y={labelTop + fontSize + padding}
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
