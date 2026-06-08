import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

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
        <AnimatePresence mode="wait">
          {mode === 'upload' ? (
            <motion.div
              key="upload"
              className="tab-content"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <UploadMode />
            </motion.div>
          ) : (
            <motion.div
              key="live"
              className="tab-content"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <LiveMode />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
