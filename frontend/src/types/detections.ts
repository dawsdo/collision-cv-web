export type Detection = {
  class: string
  confidence: number
  bbox: [number, number, number, number]
  id?: number
}

export type VideoFrame = {
  timestamp: number
  detections: Detection[]
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
