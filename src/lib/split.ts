import { EXERCISES, GROUPS, getExercise } from './exercises'
import type { PlanDay } from '../types'

const PUSH = ['Pecho', 'Hombros', 'Tríceps']
const PULL = ['Espalda', 'Bíceps', 'Antebrazos']
const LEGS = ['Cuádriceps', 'Femorales', 'Glúteos', 'Pantorrillas']
const CORE = ['Abdomen']

interface DayTemplate {
  name: string
  groups: string[]
  /** En rutinas que repiten días (A/B), qué mitad de los ejercicios de cada grupo toca. */
  part?: 0 | 1
}

const TEMPLATES: Record<number, DayTemplate[]> = {
  1: [{ name: 'Cuerpo completo', groups: GROUPS }],
  2: [
    { name: 'Torso', groups: [...PUSH, ...PULL] },
    { name: 'Pierna', groups: [...LEGS, ...CORE] },
  ],
  3: [
    { name: 'Empuje', groups: PUSH },
    { name: 'Tirón', groups: PULL },
    { name: 'Pierna', groups: [...LEGS, ...CORE] },
  ],
  4: [
    { name: 'Pecho y tríceps', groups: ['Pecho', 'Tríceps'] },
    { name: 'Espalda y bíceps', groups: ['Espalda', 'Bíceps', 'Antebrazos'] },
    { name: 'Pierna', groups: LEGS },
    { name: 'Hombros y abdomen', groups: ['Hombros', ...CORE] },
  ],
  5: [
    { name: 'Pecho', groups: ['Pecho'] },
    { name: 'Espalda', groups: ['Espalda'] },
    { name: 'Pierna', groups: LEGS },
    { name: 'Hombros y abdomen', groups: ['Hombros', ...CORE] },
    { name: 'Brazos', groups: ['Bíceps', 'Tríceps', 'Antebrazos'] },
  ],
  6: [
    { name: 'Empuje 1', groups: PUSH, part: 0 },
    { name: 'Tirón 1', groups: PULL, part: 0 },
    { name: 'Pierna 1', groups: [...LEGS, ...CORE], part: 0 },
    { name: 'Empuje 2', groups: PUSH, part: 1 },
    { name: 'Tirón 2', groups: PULL, part: 1 },
    { name: 'Pierna 2', groups: [...LEGS, ...CORE], part: 1 },
  ],
}

const LETTERS = 'ABCDEF'

export function dayLabel(i: number): string {
  return `Día ${LETTERS[i] ?? i + 1}`
}

/** Reparte los ejercicios elegidos en N días según grupos musculares. */
export function buildSplit(selection: string[], days: number): PlanDay[] {
  const order = new Map(EXERCISES.map((e, i) => [e.id, i]))
  const sorted = [...selection].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
  const byGroup = new Map<string, string[]>()
  for (const id of sorted) {
    const g = getExercise(id)?.group
    if (g) byGroup.set(g, [...(byGroup.get(g) ?? []), id])
  }

  return TEMPLATES[days].map((t) => ({
    name: t.name,
    exerciseIds: t.groups.flatMap((g) => {
      const ids = byGroup.get(g) ?? []
      if (t.part === undefined || ids.length <= 1) return ids
      return ids.filter((_, i) => i % 2 === t.part)
    }),
  }))
}
