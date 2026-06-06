import { useState } from 'react'
import './App.css'
import BackendStatus from './components/BackendStatus'
import Tabs from './components/Tabs'
import UploadMode from './components/UploadMode'
import LiveMode from './components/LiveMode'

type Mode = 'upload' | 'live'

const TABS: { id: Mode; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'live', label: 'Live' },
]

export default function App() {
  const [mode, setMode] = useState<Mode>('upload')

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__left">
          <h1 className="app-title">Collision CV Web</h1>
          <p className="app-subtitle">Computer vision for collision scene analysis</p>
        </div>
        <BackendStatus />
      </header>
      <Tabs tabs={TABS} active={mode} onChange={setMode} />
      <main className="app-content">
        {mode === 'upload' ? <UploadMode /> : <LiveMode />}
      </main>
    </div>
  )
}
