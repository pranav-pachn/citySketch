import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/entities/store/useStore'
import { ArrowLeft, User, Sliders, Shield, LogOut, UploadCloud, Check } from 'lucide-react'

export function SettingsPage() {
  const navigate = useNavigate()
  
  // State from store
  const user = useStore((s) => s.user)
  const setUser = useStore((s) => s.setUser)
  const isNightMode = useStore((s) => s.isNightMode)
  const setNightMode = useStore((s) => s.setNightMode)
  const highlightMode = useStore((s) => s.highlightMode)
  const setHighlightMode = useStore((s) => s.setHighlightMode)

  // Local state for tabs and form
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account'>('profile')
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [picture, setPicture] = useState(user?.picture || '')
  const [isSaved, setIsSaved] = useState(false)

  // Sync local state when user updates (fixes hydration/async issues)
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPicture(user.picture || '')
    }
  }, [user])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      setUser({ ...user, name, email, picture })
    } else {
      // If no user exists (e.g. guest), create a mock local user object
      setUser({ uid: 'local-user', name, email, picture })
    }
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleLogout = () => {
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-950 text-white font-sans overflow-hidden relative">
      
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none" />
      
      {/* ─── Left Sidebar ─── */}
      <div className="w-[280px] shrink-0 border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md p-6 flex flex-col h-full relative z-10">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition w-fit mb-10 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 group-hover:bg-zinc-800 transition">
            <ArrowLeft size={16} />
          </div>
          Back to Workspace
        </button>

        <h2 className="text-xl font-bold tracking-tight mb-6">Settings</h2>

        <nav className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'profile' ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <User size={16} />
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'preferences' ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <Sliders size={16} />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'account' ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <Shield size={16} />
            Account Security
          </button>
        </nav>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-[700px] mx-auto p-10 pt-16">
          <AnimatePresence mode="wait">
            
            {/* ─── Profile Tab ─── */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-bold tracking-tight">Profile Details</h3>
                  <p className="text-zinc-400 text-sm mt-1">Manage your public profile and contact information.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  
                  {/* Avatar Upload (Mock) */}
                  <div className="flex items-center gap-6 pb-6 border-b border-zinc-800/80">
                    <div className="relative h-20 w-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                      {picture ? (
                        <img src={picture} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex gap-3">
                        <button type="button" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition border border-zinc-700">
                          <UploadCloud size={16} />
                          Upload new
                        </button>
                        <button type="button" onClick={() => setPicture('')} className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition">
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">Recommended: Square image, at least 400x400px.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition placeholder:text-zinc-600"
                        placeholder="e.g. Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition placeholder:text-zinc-600"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avatar URL</label>
                    <input
                      type="url"
                      value={picture}
                      onChange={(e) => setPicture(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition placeholder:text-zinc-600"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition active:scale-[0.98] shadow-lg shadow-blue-500/20"
                    >
                      {isSaved ? <><Check size={16} /> Saved Successfully</> : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── Preferences Tab ─── */}
            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-bold tracking-tight">App Preferences</h3>
                  <p className="text-zinc-400 text-sm mt-1">Customize your workspace and analysis tools.</p>
                </div>

                <div className="space-y-4">
                  {/* Night Mode Toggle */}
                  <div className="flex items-center justify-between p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Night Mode Theme</h4>
                      <p className="text-xs text-zinc-400 mt-1">Force dark theme across all workspace views.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isNightMode} 
                        onChange={(e) => setNightMode(e.target.checked)} 
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  {/* Highlight Mode Toggle */}
                  <div className="flex items-center justify-between p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Visual Analysis Overlays</h4>
                      <p className="text-xs text-zinc-400 mt-1">Show structural insights and heatmap overlays on the grid.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={highlightMode} 
                        onChange={(e) => setHighlightMode(e.target.checked)} 
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Account Tab ─── */}
            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-bold tracking-tight">Account Security</h3>
                  <p className="text-zinc-400 text-sm mt-1">Manage your session and security settings.</p>
                </div>

                <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-red-400">Sign Out</h4>
                    <p className="text-xs text-zinc-400 mt-1">End your current session on this device.</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium transition"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
