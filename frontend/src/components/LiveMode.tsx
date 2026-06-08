import { useState, useEffect, useRef, useCallback } from 'react'
import BoundingBoxLayer from './BoundingBoxLayer'
import { LiveStreamController } from '../lib/liveStream'
import { useFrameCapture } from '../hooks/useFrameCapture'
import type { Detection } from '../types/detections'

const SERVER_URL = 'http://localhost:5000'
const FPS = 10
const JPEG_QUALITY = 0.7

type LiveState = 'idle' | 'active' | 'error'

interface DetectionResult {
  frame_id: number
  detections: Detection[]
  width: number
  height: number
  inference_time_ms: number
}

export default function LiveMode() {
  const [liveState, setLiveState] = useState<LiveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)

  const [connected, setConnected] = useState(false)
  const [latestDetection, setLatestDetection] = useState<DetectionResult | null>(null)
  const [detectionFPS, setDetectionFPS] = useState(0)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [droppedFrames, setDroppedFrames] = useState(0)

  const controllerRef = useRef<LiveStreamController | null>(null)
  const frameTimestampsRef = useRef<Map<number, number>>(new Map())
  const detectionCountRef = useRef(0)
  const detectionFpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Backpressure: frame_id currently awaiting a detection response, or null when idle.
  const inFlightFrameIdRef = useRef<number | null>(null)
  const droppedCountRef = useRef(0)

  const handleFrame = useCallback((blob: Blob, frameId: number) => {
    // Skip-if-busy: while a frame is in flight, drop newly captured frames
    // instead of queueing them. Keeps end-to-end latency bounded by one frame.
    if (inFlightFrameIdRef.current !== null) {
      droppedCountRef.current++
      return
    }
    inFlightFrameIdRef.current = frameId
    frameTimestampsRef.current.set(frameId, performance.now())
    void controllerRef.current?.sendFrame(blob, frameId)
  }, [])

  const { videoRef, isReady, error: captureError, captureFPS } = useFrameCapture({
    enabled: capturing,
    fps: FPS,
    jpegQuality: JPEG_QUALITY,
    onFrame: handleFrame,
  })

  const stopEverything = useCallback(() => {
    setCapturing(false)
    controllerRef.current?.disconnect()
    controllerRef.current = null
    if (detectionFpsIntervalRef.current) {
      clearInterval(detectionFpsIntervalRef.current)
      detectionFpsIntervalRef.current = null
    }
    frameTimestampsRef.current.clear()
    detectionCountRef.current = 0
    inFlightFrameIdRef.current = null
    droppedCountRef.current = 0
    setConnected(false)
    setLatestDetection(null)
    setDetectionFPS(0)
    setLatencyMs(null)
    setDroppedFrames(0)
  }, [])

  // Propagate camera errors from the hook
  useEffect(() => {
    if (captureError) {
      setErrorMsg(captureError)
      setLiveState('error')
      stopEverything()
    }
  }, [captureError, stopEverything])

  // Clean up everything on unmount (handles tab switches)
  useEffect(() => {
    return () => {
      stopEverything()
    }
  }, [stopEverything])

  const handleStart = () => {
    setLiveState('active')
    setCapturing(true)

    const controller = new LiveStreamController(SERVER_URL, {
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onDetections: data => {
        detectionCountRef.current++
        // Response arrived: pipeline is idle again, so the next captured frame can be sent.
        inFlightFrameIdRef.current = null
        const sentAt = frameTimestampsRef.current.get(data.frame_id)
        if (sentAt != null) {
          setLatencyMs(Math.round(performance.now() - sentAt))
          frameTimestampsRef.current.delete(data.frame_id)
        }
        setLatestDetection(data)
      },
      onError: err => {
        // Clear in-flight state so a detection error doesn't permanently jam the pipeline.
        inFlightFrameIdRef.current = null
        setErrorMsg(err)
        setLiveState('error')
        stopEverything()
      },
    })
    controller.connect()
    controllerRef.current = controller

    detectionFpsIntervalRef.current = setInterval(() => {
      setDetectionFPS(detectionCountRef.current)
      detectionCountRef.current = 0
      setDroppedFrames(droppedCountRef.current)
    }, 1000)
  }

  const handleStop = () => {
    stopEverything()
    setLiveState('idle')
  }

  if (liveState === 'idle') {
    return (
      <div className="live-mode-card">
        <p className="live-mode-card__title">Live Mode</p>
        <p className="live-mode-card__desc">
          Real-time vehicle and pedestrian detection from your webcam.
        </p>
        <p className="live-mode-card__sub">Click Start to grant camera access.</p>
        <button className="live-btn live-btn--primary" onClick={handleStart}>
          Start
        </button>
      </div>
    )
  }

  if (liveState === 'error') {
    return (
      <div className="live-mode-card live-mode-card--error">
        <p className="live-mode-card__title">Live Mode</p>
        <p className="live-mode-card__error">{errorMsg ?? 'An unknown error occurred.'}</p>
        <button
          className="live-btn live-btn--secondary"
          onClick={() => {
            setErrorMsg(null)
            setLiveState('idle')
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  // Active state
  return (
    <div className="live-mode-active">
      <div className="live-stats">
        <span className="live-stat">
          <span
            className="live-stat__dot"
            style={{ background: connected ? '#22c55e' : '#f59e0b' }}
          />
          {connected ? 'Connected' : 'Connecting...'}
        </span>
        <span className="live-stat">Capture: {captureFPS} fps</span>
        <span className="live-stat">Detection: {detectionFPS} fps</span>
        {latencyMs != null && <span className="live-stat">Latency: {latencyMs}ms</span>}
        <span className="live-stat">Dropped: {droppedFrames}</span>
        <button className="live-btn live-btn--secondary live-btn--sm" onClick={handleStop}>
          Stop
        </button>
      </div>

      <div className="live-video-container">
        {!isReady && <div className="live-waiting">Starting camera…</div>}
        <video ref={videoRef} className="live-video" muted playsInline />
        {isReady && latestDetection && (
          <svg
            className="live-overlay"
            viewBox={`0 0 ${latestDetection.width} ${latestDetection.height}`}
            preserveAspectRatio="none"
          >
            <BoundingBoxLayer
              detections={latestDetection.detections}
              imageHeight={latestDetection.height}
            />
          </svg>
        )}
      </div>
    </div>
  )
}
