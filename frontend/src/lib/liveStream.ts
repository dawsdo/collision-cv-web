import { io, Socket } from 'socket.io-client'
import type { Detection } from '../types/detections'

interface LiveStreamCallbacks {
  onConnect: () => void
  onDisconnect: () => void
  onDetections: (data: {
    frame_id: number
    detections: Detection[]
    width: number
    height: number
    inference_time_ms: number
  }) => void
  onError: (error: string) => void
}

export class LiveStreamController {
  private socket: Socket | null = null
  private readonly serverUrl: string
  private readonly callbacks: LiveStreamCallbacks

  constructor(serverUrl: string, callbacks: LiveStreamCallbacks) {
    this.serverUrl = serverUrl
    this.callbacks = callbacks
  }

  connect(): void {
    this.socket = io(this.serverUrl, {
    forceNew: true,
    transports: ['polling', 'websocket'],
    })  
    this.socket.on('connect', () => this.callbacks.onConnect())
    this.socket.on('disconnect', () => this.callbacks.onDisconnect())
    this.socket.on('connect_error', (err: Error) => this.callbacks.onError(err.message))
    this.socket.on('detections', (data) => this.callbacks.onDetections(data))
    this.socket.on('detection_error', (data: { frame_id: number; error: string }) =>
      this.callbacks.onError(`Frame ${data.frame_id}: ${data.error}`),
    )
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
  }

  async sendFrame(jpegBlob: Blob, frameId: number): Promise<void> {
    if (!this.socket?.connected) return
    const buffer = await jpegBlob.arrayBuffer()
    this.socket.emit('frame', { frame_id: frameId, frame: buffer })
  }
}
