// Iconos de línea del menú inferior: solo trazo, toman el color del texto (currentColor).

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Hoy: pesa */
export const TodayIcon = () => (
  <Icon>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Icon>
)

/** Biblioteca: base de datos */
export const LibraryIcon = () => (
  <Icon>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.75" />
    <path d="M4.5 5.5v13c0 1.52 3.36 2.75 7.5 2.75s7.5-1.23 7.5-2.75v-13" />
    <path d="M4.5 12c0 1.52 3.36 2.75 7.5 2.75s7.5-1.23 7.5-2.75" />
  </Icon>
)

/** Progreso: línea que sube */
export const ProgressIcon = () => (
  <Icon>
    <path d="M3.5 3.5v17h17" />
    <path d="M7.5 15l3.5-3.5 3 3 5.5-6" />
    <path d="M15.5 8.5h4v4" />
  </Icon>
)

/** Historial: calendario */
export const HistoryIcon = () => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
  </Icon>
)
