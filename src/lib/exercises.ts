import data from '../data/exercises.json'
import type { Exercise } from '../types'

export const EXERCISES = data as Exercise[]

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]))

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id)
}

export const GROUPS = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Antebrazos',
  'Cuádriceps',
  'Femorales',
  'Glúteos',
  'Pantorrillas',
  'Abdomen',
]

export function imageUrl(id: string, frame: 0 | 1 = 0): string {
  return `/ex/${id}/${frame}.jpg`
}

/** Agrupa ids por grupo muscular, respetando el orden de GROUPS. */
export function groupIds(ids: string[]): [string, string[]][] {
  const map = new Map<string, string[]>()
  for (const id of ids) {
    const g = getExercise(id)?.group ?? 'Otro'
    map.set(g, [...(map.get(g) ?? []), id])
  }
  return [...map.entries()].sort((a, b) => GROUPS.indexOf(a[0]) - GROUPS.indexOf(b[0]))
}
