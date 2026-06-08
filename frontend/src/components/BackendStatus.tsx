import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

type Status = 'checking' | 'connected' | 'unreachable'

const LABELS: Record<Status, string> = {
  checking:    'checking...',
  connected:   'online',
  unreachable: 'offline',
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
      {status === 'connected' ? (
        <motion.span
          className="backend-status__dot"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(74,222,128,0)',
              '0 0 0 6px rgba(74,222,128,0.2)',
              '0 0 0 12px rgba(74,222,128,0)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      ) : (
        <span className="backend-status__dot" />
      )}
      <span className="backend-status__label">{LABELS[status]}</span>
    </div>
  )
}
