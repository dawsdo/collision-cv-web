import { useState, useEffect } from 'react'
import './App.css'

type BackendStatus = 'checking' | 'connected' | 'unreachable'

function App() {
  const [status, setStatus] = useState<BackendStatus>('checking')

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

  const statusLabel: Record<BackendStatus, string> = {
    checking: 'Checking backend...',
    connected: 'Backend connected',
    unreachable: 'Backend unreachable',
  }

  return (
    <main className="page">
      <h1>Collision CV Web</h1>
      <p className="subtitle">Computer vision for collision scene analysis</p>
      <div className={`status status--${status}`}>
        {status !== 'checking' && <span className="dot" />}
        {statusLabel[status]}
      </div>
    </main>
  )
}

export default App
