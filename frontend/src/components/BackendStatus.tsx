import { useState, useEffect } from 'react'

type Status = 'checking' | 'connected' | 'unreachable'

const LABELS: Record<Status, string> = {
  checking: 'Checking...',
  connected: 'Backend ok',
  unreachable: 'Backend unreachable',
}

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/health')
        setStatus(res.ok ? 'connected' : 'unreachable')
      } catch {
        setStatus('unreachable')
      }
    }
    check()
  }, [])

  return (
    <div className={`backend-status backend-status--${status}`}>
      <span className="backend-status__dot" />
      <span className="backend-status__label">{LABELS[status]}</span>
    </div>
  )
}
