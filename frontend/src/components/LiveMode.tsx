import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
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
        <p className="live-mode-card__title">Live Detection</p>
        <p className="live-mode-card__desc">
          Real-time webcam analysis · YOLOv8 inference · 10 FPS capture
        </p>
        <motion.button
          className="live-btn live-btn--primary"
          onClick={handleStart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          Begin
        </motion.button>
      </div>
    )
  }

  if (liveState === 'error') {
    return (
      <div className="live-mode-card live-mode-card--error">
        <p className="live-mode-card__title">Live Detection</p>
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
        <div className="live-stat">
          <span className="live-stat__label">Status</span>
          <span className="live-stat__val">
            <motion.span
              className="live-stat__dot"
              style={{ background: connected ? '#4ade80' : '#f59e0b' }}
              animate={connected ? {
                boxShadow: [
                  '0 0 0 0 rgba(74,222,128,0)',
                  '0 0 0 6px rgba(74,222,128,0.2)',
                  '0 0 0 12px rgba(74,222,128,0)',
                ],
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            {connected ? 'Online' : 'Connecting'}
          </span>
        </div>
        <div className="live-stat">
          <span className="live-stat__label">Capture</span>
          <span className="live-stat__val">{captureFPS} fps</span>
        </div>
        <div className="live-stat">
          <span className="live-stat__label">Detection</span>
          <span className="live-stat__val">{detectionFPS} fps</span>
        </div>
        {latencyMs != null && (
          <div className="live-stat">
            <span className="live-stat__label">Latency</span>
            <span className="live-stat__val">{latencyMs}ms</span>
          </div>
        )}
        <div className="live-stat">
          <span className="live-stat__label">Dropped</span>
          <span className="live-stat__val">{droppedFrames}</span>
        </div>
        <button className="live-stats__end" onClick={handleStop}>
          End session
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
              animate={false}
            />
          </svg>
        )}
      </div>
    </div>
  )
}
