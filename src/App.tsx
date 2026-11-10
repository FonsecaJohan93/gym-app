import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Library from './pages/Library'
import PlanBuilder from './pages/PlanBuilder'
import Workout from './pages/Workout'
import History from './pages/History'
import Results from './pages/Results'
import Login from './pages/Login'
import { useCurrentUser } from './lib/store'
import { HistoryIcon, LibraryIcon, ProgressIcon, TodayIcon } from './components/NavIcons'

const TABS = [
  { to: '/', label: 'Hoy', Icon: TodayIcon },
  { to: '/biblioteca', label: 'Biblioteca', Icon: LibraryIcon },
  { to: '/progreso', label: 'Progreso', Icon: ProgressIcon },
  { to: '/historial', label: 'Historial', Icon: HistoryIcon },
]

export default function App() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const showNav = pathname !== '/entreno'
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if (!user) return <Login />

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <div className={showNav ? 'pb-24' : ''}>
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
      {showNav && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end
                className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px]"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`grid h-8 w-14 place-items-center rounded-full text-accent ${isActive ? 'bg-accent/15' : ''}`}
                    >
                      <t.Icon />
                    </span>
                    <span className={isActive ? 'font-semibold text-accent' : 'text-slate-600'}>{t.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
