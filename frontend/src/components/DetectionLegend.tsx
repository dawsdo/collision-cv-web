import type { Detection } from '../types/detections'
import { getClassColor } from '../lib/classColors'

type Props = {
  detections: Detection[]
}

export default function DetectionLegend({ detections }: Props) {
  const classCounts = new Map<string, number>()
  for (const det of detections) {
    classCounts.set(det.class, (classCounts.get(det.class) ?? 0) + 1)
  }
  const classes = Array.from(classCounts.entries()).sort((a, b) => b[1] - a[1])

  if (classes.length === 0) return null

  return (
    <div className="detection-legend">
      {classes.map(([cls, count]) => (
        <div key={cls} className="legend-item">
          <div className="legend-swatch" style={{ background: getClassColor(cls) }} />
          <span>{cls} <span className="legend-count">({count})</span></span>
        </div>
      ))}
    </div>
  )
}
