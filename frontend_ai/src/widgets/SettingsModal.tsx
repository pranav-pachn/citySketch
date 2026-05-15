import { useStore } from '@/entities/store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function SettingsModal() {
  const settingsOpen = useStore((s) => (s as any).settingsOpen)
  const setSettingsOpen = useStore((s) => (s as any).setSettingsOpen)
  const isNightMode = useStore((s) => s.isNightMode)
  const setNightMode = useStore((s) => s.setNightMode)
  const highlightMode = useStore((s) => s.highlightMode)
  const setHighlightMode = useStore((s) => s.setHighlightMode)
  const user = useStore((s) => s.user)
  const setUser = useStore((s) => s.setUser)

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setSettingsOpen(false)} />
          <motion.div
            initial={{ y: -8, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-[420px] bg-zinc-950/95 border border-zinc-800/60 rounded-2xl shadow-2xl p-6 z-60"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="p-2 rounded-md hover:bg-zinc-800/60">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {/* Profile Section */}
              {user && (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full border border-zinc-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-semibold">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{user.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{user.email}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Night Mode</div>
                    <div className="text-xs text-zinc-400">Toggle dark theme</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={isNightMode} onChange={(e) => setNightMode(e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Visual Analysis</div>
                    <div className="text-xs text-zinc-400">Show analysis overlays on grid</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={highlightMode} onChange={(e) => setHighlightMode(e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              {/* Logout Option */}
              <div className="pt-4 mt-2 border-t border-zinc-800/60 flex justify-end">
                <button
                  onClick={() => {
                    setUser(null)
                    setSettingsOpen(false)
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Log out
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
