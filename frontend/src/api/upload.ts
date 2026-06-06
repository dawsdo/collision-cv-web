import type { UploadResponse } from '../types/detections'

export async function uploadFile(file: File): Promise<UploadResponse> {
  const body = new FormData()
  body.append('file', file)

  let res: Response
  try {
    res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body })
  } catch {
    throw new Error('Network error: could not reach backend')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  return res.json() as Promise<UploadResponse>
}
