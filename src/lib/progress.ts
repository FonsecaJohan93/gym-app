import { GROUPS, getExercise } from './exercises'
import type { Entry, Session } from '../types'

/**
 * Fuerza estimada (1RM, fórmula de Epley): peso × (1 + reps/30).
 * Sin peso (peso corporal) se usan las repeticiones como medida.
 */
export function strength(e: Entry): number | null {
  if (e.skipped || !e.reps) return null
  if (e.weight && e.weight > 0) return e.weight * (1 + e.reps / 30)
  return e.reps
}

/** Lunes de la semana de la fecha, como YYYY-MM-DD (hora local). */
export function weekOf(iso: string): string {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Point {
  date: string
  value: number
  entry: Entry
}

export interface ExerciseProgress {
  id: string
  first: Point
  last: Point
  /** % de mejora de la fuerza estimada vs. la primera vez */
  pct: number
  count: number
}

export interface GroupProgress {
  group: string
  /** % promedio vs. la primera vez, por semana */
  weeks: { week: string; pct: number }[]
  current: number | null
  /** Cambio en puntos % respecto a hace ~4 semanas */
  change4w: number | null
  exercises: ExerciseProgress[]
  sessions: number
}

/**
 * Progreso por grupo muscular. Como cada ejercicio tiene su propia escala
 * (no es lo mismo prensa que elevaciones laterales), cada uno se compara contra
 * su primer registro y el grupo es el promedio de esos %.
 */
export function groupProgress(sessions: Session[]): GroupProgress[] {
  const byExercise = new Map<string, Point[]>()
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of s.entries) {
      const value = strength(e)
      if (value == null) continue
      byExercise.set(e.exerciseId, [...(byExercise.get(e.exerciseId) ?? []), { date: s.date, value, entry: e }])
    }
  }

  const out: GroupProgress[] = []
  for (const group of GROUPS) {
    const ids = [...byExercise.keys()].filter((id) => getExercise(id)?.group === group)
    if (ids.length === 0) continue

    // semana -> exerciseId -> mejor % de esa semana
    const perWeek = new Map<string, Map<string, number>>()
    const exercises: ExerciseProgress[] = []
    const dates = new Set<string>()
    for (const id of ids) {
      const pts = byExercise.get(id)!
      const base = pts[0].value
      for (const p of pts) {
        dates.add(p.date.slice(0, 10))
        const wk = weekOf(p.date)
        const pct = (p.value / base - 1) * 100
        const m = perWeek.get(wk) ?? new Map<string, number>()
        m.set(id, Math.max(m.get(id) ?? -Infinity, pct))
        perWeek.set(wk, m)
      }
      const last = pts[pts.length - 1]
      exercises.push({ id, first: pts[0], last, pct: (last.value / base - 1) * 100, count: pts.length })
    }

    const weeks = [...perWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, m]) => ({ week, pct: avg([...m.values()]) }))

    const hasHistory = exercises.some((e) => e.count >= 2)
    const current = hasHistory ? weeks[weeks.length - 1].pct : null
    let change4w: number | null = null
    if (current != null && weeks.length >= 2) {
      const cutoff = new Date(weeks[weeks.length - 1].week)
      cutoff.setDate(cutoff.getDate() - 28)
      const ref = [...weeks].reverse().find((w) => new Date(w.week) <= cutoff) ?? weeks[0]
      change4w = current - ref.pct
    }

    out.push({
      group,
      weeks,
      current,
      change4w,
      exercises: exercises.sort((a, b) => b.pct - a.pct),
      sessions: dates.size,
    })
  }
  return out
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function formatPct(n: number): string {
  const r = Math.round(n)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)} %`
}
