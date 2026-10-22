import { EXERCISES, getExercise } from './exercises'
import type { AppState, Entry, Exercise, Session } from '../types'

export interface DatedEntry extends Entry {
  date: string
}

/** Registros reales (no saltados) de un ejercicio, del más antiguo al más reciente. */
export function historyOf(sessions: Session[], exerciseId: string): DatedEntry[] {
  return sessions
    .flatMap((s) => s.entries.filter((e) => e.exerciseId === exerciseId && !e.skipped).map((e) => ({ ...e, date: s.date })))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function lastEntry(sessions: Session[], exerciseId: string): DatedEntry | undefined {
  const h = historyOf(sessions, exerciseId)
  return h[h.length - 1]
}

export type ProposalReason = 'no' | 'nose'

/**
 * Regla de reemplazo:
 * - 2 sesiones seguidas con "No me gustó" → proponer cambio.
 * - 3 sesiones seguidas sin "Útil" (no estoy seguro / no me gustó) → proponer cambio.
 * Si se descartó la propuesta, no se vuelve a mostrar hasta que haya un registro nuevo.
 */
export function replacementReason(state: AppState, exerciseId: string): ProposalReason | null {
  const h = historyOf(state.sessions, exerciseId)
  const dismissedAt = state.dismissed[exerciseId]
  if (dismissedAt !== undefined && h.length <= dismissedAt) return null
  const v = h.map((e) => e.verdict)
  const last = (n: number) => v.slice(-n)
  if (v.length >= 2 && last(2).every((x) => x === 'no')) return 'no'
  if (v.length >= 3 && last(3).every((x) => x === 'no' || x === 'nose')) return 'nose'
  return null
}

export interface Proposal {
  dayIndex: number
  exercise: Exercise
  reason: ProposalReason
}

export function pendingProposals(state: AppState): Proposal[] {
  if (!state.plan) return []
  const out: Proposal[] = []
  const seen = new Set<string>()
  state.plan.days.forEach((d, dayIndex) =>
    d.exerciseIds.forEach((id) => {
      if (seen.has(id)) return
      seen.add(id)
      const reason = replacementReason(state, id)
      const ex = getExercise(id)
      if (reason && ex) out.push({ dayIndex, exercise: ex, reason })
    }),
  )
  return out
}

/** Alternativas del mismo grupo muscular, mejores primero. */
export function candidatesFor(state: AppState, exerciseId: string): Exercise[] {
  const ex = getExercise(exerciseId)
  if (!ex) return []
  const inPlan = new Set(state.plan?.days.flatMap((d) => d.exerciseIds) ?? [])
  const score = (c: Exercise) => {
    const last = lastEntry(state.sessions, c.id)
    let s = 0
    if (!last) s += 1 // nunca probado
    else if (last.verdict === 'util') s += 2
    else if (last.verdict === 'no') s -= 3
    if (c.equipment === ex.equipment) s += 0.5
    return s
  }
  return EXERCISES.filter((c) => c.group === ex.group && c.id !== ex.id && !inPlan.has(c.id))
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c)
}

/** Sugerencia para hoy según cómo se sintió la última vez. */
export function effortHint(last: Entry | undefined): string | null {
  if (!last?.effort) return null
  if (last.effort === 'facil') return 'La última vez se sintió fácil: prueba subir un poco el peso.'
  if (last.effort === 'justo') return 'La última vez estuvo justo: mantén el peso e intenta una repetición más.'
  return 'La última vez fue muy duro: mantén el peso o baja un poco.'
}

export function relativeDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const days = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  )
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export const VERDICT_LABEL = { util: '👍 Útil', nose: '🤔 No estoy seguro', no: '👎 No me gustó' } as const
export const EFFORT_LABEL = { facil: 'Fácil', justo: 'Justo', duro: 'Muy duro' } as const
