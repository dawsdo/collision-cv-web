import { motion } from 'framer-motion'
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
  animate?: boolean
}

export default function BoundingBoxLayer({ detections, imageHeight, animate = false }: Props) {
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

        const inner = (
          <>
            <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} stroke={color} strokeWidth={3} fill="none" />
            <rect x={candidate.x} y={candidate.y} width={candidate.width} height={candidate.height} fill={color} />
            <text
              x={candidate.x + padding}
              y={candidate.y + fontSize + padding}
              fill="white"
              fontSize={fontSize}
              fontFamily="'JetBrains Mono', 'SF Mono', monospace"
              fontWeight="500"
            >
              {label}
            </text>
          </>
        )

        return animate ? (
          <motion.g
            key={i}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.2, ease: 'easeOut' }}
          >
            {inner}
          </motion.g>
        ) : (
          <g key={i}>{inner}</g>
        )
      })}
    </>
  )
}
