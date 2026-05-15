import { useStore } from '@/entities/store/useStore'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LogOut, User, Mail, Shield } from 'lucide-react'

export function SettingsModal() {
  const settingsOpen = useStore((s) => (s as any).settingsOpen)
  const setSettingsOpen = useStore((s) => (s as any).setSettingsOpen)
  const isNightMode = useStore((s) => s.isNightMode)
  const setNightMode = useStore((s) => s.setNightMode)
  const highlightMode = useStore((s) => s.highlightMode)
  const setHighlightMode = useStore((s) => s.setHighlightMode)
  const user = useStore((s) => s.user)
  const setUser = useStore((s) => s.setUser)
  const navigate = useNavigate()

  const handleLogout = () => {
    setUser(null)
    setSettingsOpen(false)
    navigate('/login')
  }

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
          <motion.div
            initial={{ y: -8, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="settings-modal"
          >
            {/* Header */}
            <div className="settings-header">
              <h3 className="settings-title">Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="settings-close-btn">
                <X size={16} />
              </button>
            </div>

            <div className="settings-content">

              {/* ─── Profile Section ─── */}
              {user && (
                <div className="settings-profile-card">
                  <div className="settings-avatar-area">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="settings-avatar-img" />
                    ) : (
                      <div className="settings-avatar-fallback">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="settings-avatar-badge">
                      <Shield size={10} />
                    </div>
                  </div>
                  <div className="settings-profile-info">
                    <div className="settings-profile-name">{user.name || 'CitySketch User'}</div>
                    <div className="settings-profile-email">
                      <Mail size={11} />
                      <span>{user.email}</span>
                    </div>
                    <div className="settings-profile-role">
                      <User size={11} />
                      <span>Urban Planner</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Preferences ─── */}
              <div className="settings-section-label">Preferences</div>
              <div className="settings-options">
                <div className="settings-option-row">
                  <div>
                    <div className="settings-option-title">Night Mode</div>
                    <div className="settings-option-desc">Toggle dark theme</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={isNightMode} onChange={(e) => setNightMode(e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>

                <div className="settings-option-row">
                  <div>
                    <div className="settings-option-title">Visual Analysis</div>
                    <div className="settings-option-desc">Show analysis overlays on grid</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={highlightMode} onChange={(e) => setHighlightMode(e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              {/* ─── Logout ─── */}
              <div className="settings-logout-area">
                <button onClick={handleLogout} className="settings-logout-btn">
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SettingsModal
