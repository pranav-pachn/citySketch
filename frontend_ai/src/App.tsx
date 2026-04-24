import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { LandingPage } from './pages/Landing/landing-page'
import { LoginPage } from './pages/Login/LoginPage'
import Workspace from './Workspace'
import { useStore } from './store/useStore'

export default function App() {
  useEffect(() => {
    // Block browser back/forward buttons for security
    const blockNavigation = () => {
      window.history.pushState(null, '', window.location.href)
    }
    
    // Push initial state
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', blockNavigation)

    return () => {
      window.removeEventListener('popstate', blockNavigation)
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<Workspace />} />
      <Route path="/canvas" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
