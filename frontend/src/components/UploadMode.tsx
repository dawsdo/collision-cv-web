import { useState, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { uploadFile } from '../api/upload'
import type { UploadResponse } from '../types/detections'

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
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!ALLOWED_EXTS.includes(getExt(file.name))) {
      if (inputRef.current) inputRef.current.value = ''
      setState({ phase: 'error', message: 'Unsupported file type' })
      return
    }
    setState({ phase: 'uploading', filename: file.name })
    try {
      const result = await uploadFile(file)
      setState({ phase: 'complete', filename: file.name, result })
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    setState({ phase: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  if (state.phase === 'uploading') {
    return (
      <div className="upload-mode">
        <div className="upload-zone upload-zone--processing">
          <p className="upload-zone__filename">{state.filename}</p>
          <p className="upload-zone__processing">Processing...</p>
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

    return (
      <div className="upload-mode">
        <div className="upload-zone upload-zone--complete">
          <p className="upload-zone__result-title">{summary}</p>
          <pre className="upload-zone__json">{JSON.stringify(result, null, 2)}</pre>
          <button className="upload-btn" onClick={reset}>
            Upload another
          </button>
        </div>
      </div>
    )
  }

  // idle or error
  const isError = state.phase === 'error'

  return (
    <div className="upload-mode">
      <div
        className={[
          'upload-zone',
          dragOver ? 'upload-zone--drag-over' : '',
          isError ? 'upload-zone--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
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
              Drag an image or video here, or click to browse
            </p>
            <p className="upload-zone__subtitle">
              Supports JPG, PNG, MP4, MOV, WebM (videos up to 60s)
            </p>
          </>
        )}
      </div>
    </div>
  )
}
