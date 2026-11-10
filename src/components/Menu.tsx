import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HistoryIcon, LibraryIcon, ProgressIcon, TodayIcon } from './NavIcons'
import { useCurrentUser } from '../lib/store'
import { APP_VERSION } from '../lib/version'

const ITEMS = [
  { to: '/', label: 'Hoy', Icon: TodayIcon },
  { to: '/biblioteca', label: 'Biblioteca', Icon: LibraryIcon },
  { to: '/progreso', label: 'Progreso', Icon: ProgressIcon },
  { to: '/historial', label: 'Historial', Icon: HistoryIcon },
]

const MenuContext = createContext<() => void>(() => {})

/** Envuelve la app: guarda si el panel lateral está abierto y lo dibuja. */
export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const user = useCurrentUser()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <MenuContext.Provider value={() => setOpen(true)}>
      {children}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`pb-safe fixed inset-y-0 left-0 z-50 flex w-[78%] max-w-[300px] flex-col bg-panel shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 pt-6 pb-5">
          <img src="/pwa-192x192.png" alt="" className="h-10 w-10 rounded-xl" />
          <div className="min-w-0">
            <div className="text-lg leading-tight font-bold">Gym</div>
            {user && <div className="truncate text-sm text-slate-600">{user}</div>}
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-base ${
                  isActive ? 'bg-accent/15 font-semibold text-accent' : 'text-slate-800 active:bg-ink'
                }`
              }
            >
              <span className="text-accent">
                <Icon />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 pb-5 text-xs text-slate-500">{APP_VERSION}</p>
      </aside>
    </MenuContext.Provider>
  )
}

export function MenuButton() {
  const openMenu = useContext(MenuContext)
  return (
    <button
      onClick={openMenu}
      className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-accent active:bg-accent/15"
      aria-label="Abrir menú"
    >
      <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  )
}

/** Título de pantalla con el botón de menú al lado. */
export function PageTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MenuButton />
      <h1 className="min-w-0 text-2xl font-bold">{children}</h1>
    </div>
  )
}

/** Barra fija abajo para el botón principal de la pantalla (deja espacio para no tapar el contenido). */
export function BottomCTA({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="h-28" />
      <div className="pb-safe fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink from-60% to-transparent px-4 pt-6">
        <div className="mx-auto max-w-lg pb-4">{children}</div>
      </div>
    </>
  )
}
