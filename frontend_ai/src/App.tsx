import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/Landing/landing-page'
import Workspace from './Workspace'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<Workspace />} />
    </Routes>

