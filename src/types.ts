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
  entries: Record<string, Entry>
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
  /** Última modificación; decide qué copia gana al sincronizar */
  updatedAt?: string
}
