import { getState, setState } from './store'
import { historyOf, lastEntry } from './insights'
import type { Entry, PlanDay } from '../types'

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

export function startWorkout(dayIndex: number): void {
  const { plan, sessions } = getState()
  if (!plan) return
  const entries: Record<string, Entry> = {}
  for (const id of plan.days[dayIndex].exerciseIds) {
    // Precargar con lo de la última vez: normalmente solo se confirma
    const last = lastEntry(sessions, id)
    entries[id] = {
      exerciseId: id,
      weight: last?.weight ?? null,
      sets: last?.sets ?? 3,
      reps: last?.reps ?? 10,
      comment: '',
      effort: null,
      verdict: null,
    }
  }
  setState((s) => ({ ...s, draft: { dayIndex, startedAt: new Date().toISOString(), index: 0, entries } }))
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

export function cancelWorkout(): void {
  setState((s) => ({ ...s, draft: null }))
}

export function finishWorkout(): void {
  setState((s) => {
    if (!s.draft || !s.plan) return s
    const day = s.plan.days[s.draft.dayIndex]
    const entries = day.exerciseIds.map((id) => s.draft!.entries[id]).filter(Boolean)
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
