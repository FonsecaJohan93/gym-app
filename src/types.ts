export interface Exercise {
  id: string
  es: string
  en: string
  group: string
  muscles: string[]
  secondary: string[]
  equipment: string
  level: string
}

/** ¿El ejercicio te sirve? Decide si se queda o se propone un reemplazo. */
export type Verdict = 'util' | 'nose' | 'no'
/** ¿Qué tan duro estuvo? Decide la sugerencia de peso para la próxima vez. */
export type Effort = 'facil' | 'justo' | 'duro'

export interface Entry {
  exerciseId: string
  weight: number | null
  sets: number | null
  reps: number | null
  comment: string
  effort: Effort | null
  verdict: Verdict | null
  skipped?: boolean
}

export interface Session {
  id: string
  date: string // ISO
  dayIndex: number
  dayName: string
  entries: Entry[]
}

export interface PlanDay {
  name: string
  exerciseIds: string[]
}

export interface Plan {
  days: PlanDay[]
  nextDay: number
  createdAt: string
}

export interface Swap {
  date: string
  dayIndex: number
  fromId: string
  toId: string
}

/** Entrenamiento en curso, guardado para no perderlo si el celular se bloquea. */
export interface Draft {
  dayIndex: number
  startedAt: string
  index: number
  /** Orden de hoy (cambia con "para luego", agregar o cambiar). Sin él, el orden del día del plan. */
  order?: string[]
  /** Series marcadas con el botón de descanso, por ejercicio (solo ayuda a contar; no se guarda en la sesión) */
  setsDone?: Record<string, number>
  /** Descanso en curso: se guarda la hora de fin para que siga contando con el celular bloqueado */
  rest?: { endsAt: string; seconds: number } | null
  entries: Record<string, Entry>
}

export interface Settings {
  restEnabled: boolean
  restSeconds: number
}

export interface AppState {
  version: 1
  selection: string[]
  plan: Plan | null
  sessions: Session[]
  swaps: Swap[]
  /** exerciseId -> nº de registros que tenía cuando se descartó la propuesta de reemplazo */
  dismissed: Record<string, number>
  draft: Draft | null
  settings?: Settings
  /** Última modificación; decide qué copia gana al sincronizar */
  updatedAt?: string
}
