import type { Detection } from '../types/detections'
import BoundingBoxLayer from './BoundingBoxLayer'

type Props = {
  imageUrl: string
  width: number
  height: number
  detections: Detection[]
}

export default function DetectionOverlay({ imageUrl, width, height, detections }: Props) {
  return (
    <div className="detection-container">
      <img src={imageUrl} alt="Uploaded" style={{ width: '100%', display: 'block' }} />
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <BoundingBoxLayer detections={detections} imageHeight={height} />
      </svg>
    </div>
  )
}
