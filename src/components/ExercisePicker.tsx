import { useMemo, useState } from 'react'
import { EXERCISES, GROUPS } from '../lib/exercises'
import { candidatesFor, type Recommendation } from '../lib/insights'
import { useAppState } from '../lib/store'
import { ExerciseImage } from './ExerciseImage'
import type { Exercise } from '../types'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Hoja para elegir un ejercicio de la biblioteca.
 * Con `replacing`, arranca en su grupo muscular y ordena primero los recomendados.
 */
export function ExercisePicker({
  title,
  replacing,
  recommendations = [],
  exclude,
  onPick,
  onClose,
}: {
  title: string
  replacing?: Exercise
  /** Sugerencias con su razón; se muestran arriba mientras no se busque ni filtre */
  recommendations?: Recommendation[]
  exclude: string[]
  onPick: (e: Exercise) => void
  onClose: () => void
}) {
  const state = useAppState()
  const [group, setGroup] = useState<string | null>(replacing?.group ?? null)
  const [query, setQuery] = useState('')

  const rank = useMemo(() => {
    if (!replacing) return new Map<string, number>()
    return new Map(candidatesFor(state, replacing.id).map((e, i) => [e.id, i]))
  }, [state, replacing])

  const list = useMemo(() => {
    const q = normalize(query.trim())
    const skip = new Set(exclude)
    return EXERCISES.filter(
      (e) => !skip.has(e.id) && (!group || e.group === group) && (!q || normalize(e.es).includes(q) || normalize(e.en).includes(q)),
    ).sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999))
  }, [query, group, exclude, rank])

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-ink">
      <header className="mx-auto w-full max-w-lg px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="px-2 text-2xl text-slate-600" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {replacing && <p className="text-sm text-slate-600">En lugar de {replacing.es}</p>}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en español o inglés…"
          className="mt-3 w-full rounded-xl border border-line bg-panel px-4 py-3 text-base outline-none focus:border-accent"
        />
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {[null, ...GROUPS].map((g) => (
            <button
              key={g ?? 'todos'}
              onClick={() => setGroup(g)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap ${
                group === g ? 'border-accent bg-accent/15 text-accent' : 'border-line text-slate-700'
              }`}
            >
              {g ?? 'Todos'}
            </button>
          ))}
        </div>
      </header>

      <div className="pb-safe mx-auto w-full max-w-lg flex-1 space-y-2 overflow-y-auto px-4 pb-6">
        {recommendations.length > 0 && !query && !group && (
          <section className="mb-4 rounded-2xl bg-accent/10 p-3">
            <h3 className="px-1 text-sm font-semibold text-accent">★ Recomendado para hoy</h3>
            <div className="mt-2 space-y-2">
              {recommendations.map(({ exercise: e, reason }) => (
                <button
                  key={e.id}
                  onClick={() => onPick(e)}
                  className="flex w-full items-center gap-3 rounded-xl bg-panel p-2 text-left active:scale-[0.99]"
                >
                  <ExerciseImage id={e.id} className="h-16 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="leading-tight font-semibold">{e.es}</div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {e.group} · {e.equipment}
                    </div>
                    {reason && <div className="mt-0.5 text-xs font-medium text-accent">{reason}</div>}
                  </div>
                </button>
              ))}
            </div>
            <h3 className="mt-4 px-1 text-sm font-semibold text-slate-600">Toda la biblioteca</h3>
          </section>
        )}
        {list.length === 0 && <p className="py-10 text-center text-slate-600">Sin resultados.</p>}
        {list.map((e) => {
          const recommended = (rank.get(e.id) ?? 999) < 3
          return (
            <button
              key={e.id}
              onClick={() => onPick(e)}
              className="flex w-full items-center gap-3 rounded-xl bg-panel p-2 text-left active:scale-[0.99]"
            >
              <ExerciseImage id={e.id} className="h-16 w-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="leading-tight font-semibold">{e.es}</div>
                <div className="truncate text-xs text-slate-500">{e.en}</div>
                <div className="mt-0.5 text-xs text-slate-600">
                  {e.group} · {e.equipment}
                  {recommended && <span className="ml-1.5 text-accent">★ Recomendado</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
