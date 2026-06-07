import { useRef, useState, useEffect, useCallback } from 'react'

interface UseFrameCaptureOptions {
  enabled: boolean
  fps: number
  jpegQuality: number
  onFrame: (blob: Blob, frameId: number) => void
}

interface UseFrameCaptureResult {
  videoRef: React.RefObject<HTMLVideoElement>
  isReady: boolean
  error: string | null
  captureFPS: number
}

export function useFrameCapture({
  enabled,
  fps,
  jpegQuality,
  onFrame,
}: UseFrameCaptureOptions): UseFrameCaptureResult {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captureFPS, setCaptureFPS] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const frameIdRef = useRef(0)
  const fpsCountRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Stable ref so changing onFrame never restarts the camera
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current)
      fpsIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    fpsCountRef.current = 0
    setIsReady(false)
    setCaptureFPS(0)
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopCapture()
      setError(null)
      return
    }

    // cancelled flag guards against getUserMedia resolving after unmount/disable
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }

        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas')
        }

        setIsReady(true)
        setError(null)

        captureIntervalRef.current = setInterval(() => {
          const vid = videoRef.current
          const canvas = canvasRef.current
          if (!vid || !canvas || vid.readyState < 2) return

          canvas.width = vid.videoWidth
          canvas.height = vid.videoHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          ctx.drawImage(vid, 0, 0)
          const id = frameIdRef.current++
          canvas.toBlob(
            blob => {
              if (blob) {
                fpsCountRef.current++
                onFrameRef.current(blob, id)
              }
            },
            'image/jpeg',
            jpegQuality,
          )
        }, 1000 / fps)

        // Rolling 1-second FPS counter
        fpsIntervalRef.current = setInterval(() => {
          setCaptureFPS(fpsCountRef.current)
          fpsCountRef.current = 0
        }, 1000)
      } catch (err) {
        if (cancelled) return
        let msg = 'Camera unavailable'
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = 'Camera permission denied'
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg = 'No camera found'
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            msg = 'Camera is in use by another app'
          }
        }
        setError(msg)
        setIsReady(false)
      }
    }

    start()

    return () => {
      cancelled = true
      stopCapture()
    }
  }, [enabled, fps, jpegQuality, stopCapture])

  return { videoRef, isReady, error, captureFPS }
}
