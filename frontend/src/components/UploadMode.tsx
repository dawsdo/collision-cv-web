import { useState, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { uploadFile } from '../api/upload'
import type { UploadResponse } from '../types/detections'
import DetectionOverlay from './DetectionOverlay'
import DetectionLegend from './DetectionLegend'
import VideoOverlay from './VideoOverlay'

type UploadState =
  | { phase: 'idle' }
  | { phase: 'error'; message: string }
  | { phase: 'uploading'; filename: string }
  | { phase: 'complete'; filename: string; result: UploadResponse }

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'mp4', 'mov', 'webm']

function getExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function detectionCount(result: UploadResponse): number {
  if (result.type === 'image') return result.detections.length
  return result.frames.reduce((acc, f) => acc + f.detections.length, 0)
}

export default function UploadMode() {
  const [state, setState] = useState<UploadState>({ phase: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })

    if (!ALLOWED_EXTS.includes(getExt(file.name))) {
      if (inputRef.current) inputRef.current.value = ''
      setState({ phase: 'error', message: 'Unsupported file type' })
      return
    }

    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setState({ phase: 'uploading', filename: file.name })

    try {
      const result = await uploadFile(file)
      setState({ phase: 'complete', filename: file.name, result })
    } catch (err) {
      URL.revokeObjectURL(url)
      setImageUrl(null)
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setState({ phase: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  if (state.phase === 'uploading') {
    return (
      <div className="upload-mode">
        <div className="upload-zone upload-zone--processing">
          <p className="upload-zone__filename">{state.filename}</p>
          <div className="upload-zone__processing">
            Processing
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="processing-dot"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (state.phase === 'complete') {
    const { result } = state
    const count = detectionCount(result)
    const summary =
      result.type === 'image'
        ? `${count} detection${count !== 1 ? 's' : ''} found`
        : `${result.frames.length} frame${result.frames.length !== 1 ? 's' : ''} analyzed, ${count} total detection${count !== 1 ? 's' : ''}`

    if (result.type === 'image' && imageUrl) {
      return (
        <div className="upload-mode">
          <div className="upload-result">
            <p className="upload-zone__result-title">{summary}</p>
            <DetectionOverlay
              imageUrl={imageUrl}
              width={result.width}
              height={result.height}
              detections={result.detections}
            />
            <DetectionLegend detections={result.detections} />
            <button className="upload-btn" onClick={reset}>
              Upload another
            </button>
          </div>
        </div>
      )
    }

    if (result.type === 'video' && imageUrl) {
      const allDetections = result.frames.flatMap(f => f.detections)
      return (
        <div className="upload-mode">
          <div className="upload-result">
            <p className="upload-zone__result-title">{summary}</p>
            <VideoOverlay
              videoUrl={imageUrl}
              width={result.width}
              height={result.height}
              frames={result.frames}
              duration={result.duration}
            />
            <DetectionLegend detections={allDetections} />
            <button className="upload-btn" onClick={reset}>
              Upload another
            </button>
          </div>
        </div>
      )
    }
  }

  const isError = state.phase === 'error'

  return (
    <div className="upload-mode">
      <motion.div
        className={[
          'upload-zone',
          dragOver ? 'upload-zone--drag-over' : '',
          isError ? 'upload-zone--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        animate={{ scale: dragOver ? 1.005 : 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.mp4,.mov,.webm"
          className="upload-zone__input"
          onChange={onInputChange}
        />
        {isError ? (
          <p className="upload-zone__error">{state.message}</p>
        ) : (
          <>
            <p className="upload-zone__title">
              Drag an image or video to analyze
            </p>
            <p className="upload-zone__subtitle">
              JPG, PNG, MP4, MOV, WebM · up to 60s
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
