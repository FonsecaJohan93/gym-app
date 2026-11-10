import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Library from './pages/Library'
import PlanBuilder from './pages/PlanBuilder'
import Workout from './pages/Workout'
import History from './pages/History'
import Results from './pages/Results'
import Login from './pages/Login'
import { useCurrentUser } from './lib/store'
import { MenuProvider } from './components/Menu'

export default function App() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if (!user) return <Login />

  // La navegación vive en el panel lateral (☰ junto al título de cada pantalla)
  return (
    <MenuProvider>
      <div className="mx-auto min-h-dvh max-w-lg">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/rutina" element={<PlanBuilder />} />
          <Route path="/entreno" element={<Workout />} />
          <Route path="/progreso" element={<Results />} />
          <Route path="/historial" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </MenuProvider>
  )
}
