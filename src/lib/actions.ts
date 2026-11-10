import { getState, setState } from './store'
import { historyOf, lastEntry } from './insights'
import type { Draft, Entry, Plan, PlanDay, Session } from '../types'

export function toggleSelection(id: string): void {
  setState((s) => ({
    ...s,
    selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id],
  }))
}

export function savePlan(days: PlanDay[]): void {
  setState((s) => ({
    ...s,
    plan: { days, nextDay: 0, createdAt: new Date().toISOString() },
    draft: null,
  }))
}

export function setNextDay(dayIndex: number): void {
  setState((s) => (s.plan ? { ...s, plan: { ...s.plan, nextDay: dayIndex } } : s))
}

/** Registro nuevo precargado con lo de la última vez: normalmente solo se confirma. */
function newEntry(sessions: Session[], id: string): Entry {
  const last = lastEntry(sessions, id)
  return {
    exerciseId: id,
    weight: last?.weight ?? null,
    sets: last?.sets ?? 3,
    reps: last?.reps ?? 10,
    comment: '',
    effort: null,
    verdict: null,
  }
}

/** Orden de los ejercicios de hoy en el entrenamiento en curso. */
export function workoutOrder(draft: Draft, plan: Plan): string[] {
  return draft.order ?? plan.days[draft.dayIndex].exerciseIds
}

export function startWorkout(dayIndex: number): void {
  const { plan, sessions } = getState()
  if (!plan) return
  const order = plan.days[dayIndex].exerciseIds
  const entries: Record<string, Entry> = {}
  for (const id of order) entries[id] = newEntry(sessions, id)
  setState((s) => ({ ...s, draft: { dayIndex, startedAt: new Date().toISOString(), index: 0, order, entries } }))
}

/** "Para luego": manda el ejercicio actual al final de la lista de hoy (p. ej. máquina ocupada). */
export function postponeCurrent(): void {
  setState((s) => {
    if (!s.draft || !s.plan) return s
    const order = [...workoutOrder(s.draft, s.plan)]
    const [id] = order.splice(s.draft.index, 1)
    if (!id) return s
    order.push(id)
    return { ...s, draft: { ...s.draft, order } }
  })
}

/** Agrega un ejercicio a hoy como el siguiente; con `permanent` también al día del plan. */
export function addToWorkout(id: string, permanent: boolean): void {
  setState((s) => {
    if (!s.draft || !s.plan) return s
    const order = [...workoutOrder(s.draft, s.plan)]
    if (order.includes(id)) return s
    const at = Math.min(s.draft.index + (s.draft.index < order.length ? 1 : 0), order.length)
    order.splice(at, 0, id)
    const dayIndex = s.draft.dayIndex
    const plan = permanent
      ? {
          ...s.plan,
          days: s.plan.days.map((d, i) =>
            i === dayIndex && !d.exerciseIds.includes(id) ? { ...d, exerciseIds: [...d.exerciseIds, id] } : d,
          ),
        }
      : s.plan
    return {
      ...s,
      plan,
      selection: permanent && !s.selection.includes(id) ? [...s.selection, id] : s.selection,
      draft: { ...s.draft, order, entries: { ...s.draft.entries, [id]: newEntry(s.sessions, id) } },
    }
  })
}

/** Cambia el ejercicio de hoy por otro; con `permanent` también en la rutina (como aceptar un reemplazo). */
export function swapInWorkout(fromId: string, toId: string, permanent: boolean): void {
  setState((s) => {
    if (!s.draft || !s.plan) return s
    const order = workoutOrder(s.draft, s.plan).map((id) => (id === fromId ? toId : id))
    const { [fromId]: _, ...entries } = s.draft.entries
    return {
      ...s,
      draft: { ...s.draft, order, entries: { ...entries, [toId]: newEntry(s.sessions, toId) } },
    }
  })
  if (permanent) acceptSwap(fromId, toId)
}

export function updateEntry(exerciseId: string, patch: Partial<Entry>): void {
  setState((s) =>
    s.draft
      ? {
          ...s,
          draft: { ...s.draft, entries: { ...s.draft.entries, [exerciseId]: { ...s.draft.entries[exerciseId], ...patch } } },
        }
      : s,
  )
}

export function setDraftIndex(index: number): void {
  setState((s) => (s.draft ? { ...s, draft: { ...s.draft, index } } : s))
}

/**
 * "Terminar por hoy": lo que ya calificaste se queda, lo que falta queda como no hecho,
 * y se pasa al resumen para guardar (desde ahí aún se puede volver a un ejercicio).
 */
export function endWorkoutEarly(): void {
  setState((s) => {
    if (!s.draft || !s.plan) return s
    const order = workoutOrder(s.draft, s.plan)
    const entries = { ...s.draft.entries }
    for (const id of order) if (!entries[id]?.verdict) entries[id] = { ...entries[id], skipped: true, verdict: null }
    return { ...s, draft: { ...s.draft, entries, index: order.length } }
  })
}

export function cancelWorkout(): void {
  setState((s) => ({ ...s, draft: null }))
}

export function finishWorkout(): void {
  setState((s) => {
    if (!s.draft || !s.plan) return s
    const day = s.plan.days[s.draft.dayIndex]
    const entries = workoutOrder(s.draft, s.plan).map((id) => s.draft!.entries[id]).filter(Boolean)
    return {
      ...s,
      sessions: [
        ...s.sessions,
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          dayIndex: s.draft.dayIndex,
          dayName: day.name,
          entries,
        },
      ],
      plan: { ...s.plan, nextDay: (s.draft.dayIndex + 1) % s.plan.days.length },
      draft: null,
    }
  })
}

/** Cambia un ejercicio por otro en todos los días donde aparece. */
export function acceptSwap(fromId: string, toId: string): void {
  setState((s) => {
    if (!s.plan) return s
    const swaps = [...s.swaps]
    const days = s.plan.days.map((d, dayIndex) => {
      if (!d.exerciseIds.includes(fromId)) return d
      swaps.push({ date: new Date().toISOString(), dayIndex, fromId, toId })
      return { ...d, exerciseIds: d.exerciseIds.map((id) => (id === fromId ? toId : id)) }
    })
    const { [fromId]: _, ...dismissed } = s.dismissed
    return {
      ...s,
      plan: { ...s.plan, days },
      swaps,
      dismissed,
      selection: s.selection.map((id) => (id === fromId ? toId : id)),
    }
  })
}

export function dismissProposal(exerciseId: string): void {
  setState((s) => ({
    ...s,
    dismissed: { ...s.dismissed, [exerciseId]: historyOf(s.sessions, exerciseId).length },
  }))
}

export function deleteSession(id: string): void {
  setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }))
}
