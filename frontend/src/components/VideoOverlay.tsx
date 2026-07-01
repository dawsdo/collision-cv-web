import { useRef, useState, useEffect, useMemo } from 'react'
import type { VideoFrame } from '../types/detections'
import BoundingBoxLayer from './BoundingBoxLayer'
import ProximityLayer from './ProximityLayer'

interface Props {
  videoUrl: string
  width: number
  height: number
  frames: VideoFrame[]
  duration: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoOverlay({ videoUrl, width, height, frames, duration }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const wasPlayingBeforeDrag = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const sortedFrames = useMemo(
    () => [...frames].sort((a, b) => a.timestamp - b.timestamp),
    [frames]
  )

  // Most recent frame at or before currentTime; detections persist until next sample.
  const currentFrame = useMemo(() => {
    let result: VideoFrame | undefined
    for (const frame of sortedFrames) {
      if (frame.timestamp <= currentTime) result = frame
      else break
    }
    return result
  }, [sortedFrames, currentTime])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.pause()
    else video.play()
  }

  const seekFromClientX = (clientX: number) => {
    const scrubber = scrubberRef.current
    const video = videoRef.current
    if (!scrubber || !video) return
    const rect = scrubber.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    video.currentTime = ratio * duration
  }

  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX)
  }

  const onThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    wasPlayingBeforeDrag.current = isPlaying
    videoRef.current?.pause()

    const onMouseMove = (ev: MouseEvent) => seekFromClientX(ev.clientX)
    const onMouseUp = () => {
      isDragging.current = false
      if (wasPlayingBeforeDrag.current) videoRef.current?.play()
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className="video-container">
      <div className="video-wrapper">
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ width: '100%', display: 'block', aspectRatio: `${width}/${height}` }}
          playsInline
        />
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox={`0 0 ${width} ${height}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <ProximityLayer detections={currentFrame?.detections ?? []} pairs={currentFrame?.proximity ?? []} />
          <BoundingBoxLayer detections={currentFrame?.detections ?? []} imageHeight={height} animate={false} />
        </svg>
      </div>
      <div className="playback-bar">
        <button
          className="play-pause-button"
          onClick={togglePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="4" y="3" width="4" height="14" rx="1" />
              <rect x="12" y="3" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3.5l12 6.5-12 6.5V3.5z" />
            </svg>
          )}
        </button>
        <span className="time-display">
          <span className="time-current">{formatTime(currentTime)}</span>
          {' / '}
          {formatTime(duration)}
        </span>
        <div
          ref={scrubberRef}
          className="scrubber-track"
          onClick={onTrackClick}
        >
          <div className="scrubber-hairline" />
          <div className="scrubber-played" style={{ width: `${progress * 100}%` }} />
          {sortedFrames.map((frame, i) => (
            <div
              key={i}
              className={`scrubber-tick ${frame.detections.length > 0 ? 'scrubber-tick--has-detections' : 'scrubber-tick--empty'}`}
              style={{ left: `${(frame.timestamp / duration) * 100}%` }}
              onClick={(e) => {
                e.stopPropagation()
                if (videoRef.current) videoRef.current.currentTime = frame.timestamp
              }}
            />
          ))}
          <div
            className="scrubber-thumb"
            style={{ left: `${progress * 100}%` }}
            onMouseDown={onThumbMouseDown}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  )
}
