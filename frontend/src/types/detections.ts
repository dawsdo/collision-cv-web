export type Detection = {
  class: string
  confidence: number
  bbox: [number, number, number, number]
  id?: number
}

export type ProximityPair = {
  id_a: number
  id_b: number
  center_distance: number
  box_gap: number
  is_close: boolean
}

export type VideoFrame = {
  timestamp: number
  detections: Detection[]
  proximity: ProximityPair[]
}

export type ImageResponse = {
  type: 'image'
  detections: Detection[]
  width: number
  height: number
}

export type VideoResponse = {
  type: 'video'
  frames: VideoFrame[]
  duration: number
  width: number
  height: number
}

export type UploadResponse = ImageResponse | VideoResponse
