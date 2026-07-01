import type { Detection, ProximityPair } from '../types/detections'

interface Props {
  detections: Detection[]
  pairs: ProximityPair[]
}

export default function ProximityLayer({ detections, pairs }: Props) {
  if (pairs.length === 0) return null

  // Index detections by track id for O(1) center lookups
  const byId = new Map<number, Detection>()
  for (const det of detections) {
    if (det.id != null) byId.set(det.id, det)
  }

  return (
    <>
      {pairs.map(pair => {
        const a = byId.get(pair.id_a)
        const b = byId.get(pair.id_b)
        if (!a || !b) return null

        const [x1a, y1a, x2a, y2a] = a.bbox
        const [x1b, y1b, x2b, y2b] = b.bbox
        const cxa = (x1a + x2a) / 2
        const cya = (y1a + y2a) / 2
        const cxb = (x1b + x2b) / 2
        const cyb = (y1b + y2b) / 2

        return (
          <line
            key={`${pair.id_a}-${pair.id_b}`}
            x1={cxa}
            y1={cya}
            x2={cxb}
            y2={cyb}
            stroke="rgba(250,204,21,0.6)"
            strokeWidth={1.5}
            strokeDasharray="8 5"
          />
        )
      })}
    </>
  )
}
