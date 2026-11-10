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

export interface Recommendation {
  exercise: Exercise
  reason: string
}

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)

/**
 * Recomendaciones para agregar un ejercicio al entrenamiento de hoy. Puntaje con:
 * 1. Lo que le falta al día: el grupo con menos ejercicios hoy y músculos que nada de la rutina trabaja.
 * 2. La semana: músculos que llevas más días sin trabajar.
 * 3. Tu historial: primero los que marcaste útiles, luego los nunca probados; abajo los que no te gustaron.
 * 4. Que sea práctico: mismo tipo de equipo que hoy y menos peso a los de nivel experto.
 * Cada recomendación trae la razón que más pesó.
 */
export function addRecommendations(state: AppState, todayIds: string[], limit = 3): Recommendation[] {
  const today = todayIds.map(getExercise).filter((e): e is Exercise => !!e)
  const groups = new Set(today.map((e) => e.group))
  const perGroup = new Map<string, number>()
  for (const e of today) perGroup.set(e.group, (perGroup.get(e.group) ?? 0) + 1)
  const maxPerGroup = Math.max(0, ...perGroup.values())
  const equipmentToday = new Set(today.map((e) => e.equipment))

  // Músculos que trabaja la rutina completa (principales y secundarios)
  const planIds = new Set([...(state.plan?.days.flatMap((d) => d.exerciseIds) ?? []), ...todayIds])
  const covered = new Set(
    [...planIds].flatMap((id) => {
      const e = getExercise(id)
      return e ? [...e.muscles, ...e.secondary] : []
    }),
  )

  // Última vez que se trabajó cada músculo como principal
  const lastByMuscle = new Map<string, string>()
  for (const s of state.sessions)
    for (const en of s.entries) {
      if (en.skipped) continue
      for (const m of getExercise(en.exerciseId)?.muscles ?? [])
        if ((lastByMuscle.get(m) ?? '') < s.date) lastByMuscle.set(m, s.date)
    }

  const skip = planIds // hoy y lo que ya está en otro día de la rutina
  const scored = EXERCISES.filter((c) => !skip.has(c.id) && (groups.size === 0 || groups.has(c.group))).map((c) => {
    const reasons: [number, string][] = []

    const gap = maxPerGroup - (perGroup.get(c.group) ?? 0)
    if (gap > 0) {
      const n = perGroup.get(c.group) ?? 0
      reasons.push([gap * 1.5, n === 0 ? `Hoy no tienes nada de ${c.group.toLowerCase()}` : `Hoy solo tienes ${n} de ${c.group.toLowerCase()}`])
    }

    const uncovered = c.muscles.find((m) => !covered.has(m))
    if (uncovered) reasons.push([2, `Nada en tu rutina trabaja ${uncovered}`])

    const lastDates = c.muscles.map((m) => lastByMuscle.get(m))
    if (state.sessions.length > 0) {
      if (lastDates.every((d) => !d)) reasons.push([1.5, `Aún no has trabajado ${c.muscles[0]}`])
      else {
        const days = Math.min(...lastDates.filter((d): d is string => !!d).map(daysSince))
        if (days >= 7) reasons.push([1.5, `No trabajas ${c.muscles[0]} desde hace ${days} días`])
      }
    }

    const last = lastEntry(state.sessions, c.id)
    if (last?.verdict === 'util') reasons.push([2, 'Lo marcaste como útil'])
    else if (!last) reasons.push([1, 'Nunca lo has probado'])
    else if (last.verdict === 'no') reasons.push([-3, ''])

    if (equipmentToday.has(c.equipment)) reasons.push([0.5, `Usa ${c.equipment.toLowerCase()}, como lo de hoy`])
    if (c.level === 'expert') reasons.push([-1, ''])

    const score = reasons.reduce((a, [w]) => a + w, 0)
    const best = reasons.filter(([, r]) => r).sort((a, b) => b[0] - a[0])[0]
    return { exercise: c, score, reason: best?.[1] ?? '' }
  })

  // Elegir de a uno, castigando repetir grupo para que no salgan 3 de lo mismo
  const picked: Recommendation[] = []
  const pool = [...scored]
  while (picked.length < limit && pool.length) {
    const penalty = (g: string) => picked.filter((p) => p.exercise.group === g).length * 1.5
    pool.sort((a, b) => b.score - penalty(b.exercise.group) - (a.score - penalty(a.exercise.group)))
    const { exercise, reason } = pool.shift()!
    picked.push({ exercise, reason })
  }
  return picked
}
