import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getExercise, groupIds } from '../lib/exercises'
import { buildSplit, dayLabel } from '../lib/split'
import { savePlan } from '../lib/actions'
import { useAppState } from '../lib/store'
import { ExerciseImage } from '../components/ExerciseImage'
import type { PlanDay } from '../types'

export default function PlanBuilder() {
  const { selection, plan } = useAppState()
  const navigate = useNavigate()
  const [days, setDays] = useState<number>(plan?.days.length ?? 3)
  const initial = useMemo(() => buildSplit(selection, days), [selection, days])
  const [edited, setEdited] = useState<{ days: number; plan: PlanDay[] } | null>(null)
  const current = edited?.days === days ? edited.plan : initial

  if (selection.length === 0) {
    return (
      <div className="p-6 pt-12 text-center">
        <p className="text-slate-300">Primero elige ejercicios en la biblioteca.</p>
        <Link to="/biblioteca" className="mt-4 inline-block rounded-xl bg-accent px-5 py-3 font-bold text-ink">
          Ir a la biblioteca
        </Link>
      </div>
    )
  }

  const move = (from: number, id: string, to: number) => {
    const next = current.map((d, i) => {
      if (i === from) return { ...d, exerciseIds: d.exerciseIds.filter((x) => x !== id) }
      if (i === to && !d.exerciseIds.includes(id)) return { ...d, exerciseIds: [...d.exerciseIds, id] }
      return d
    })
    setEdited({ days, plan: next })
  }

  const save = () => {
    if (plan && !confirm('Esto reemplaza tu rutina actual. Tu historial se conserva. ¿Continuar?')) return
    savePlan(current)
    navigate('/')
  }

  const empty = current.filter((d) => d.exerciseIds.length === 0).length

  return (
    <div className="px-4">
      <header>
        <Link to="/biblioteca" className="mt-4 inline-block text-sm text-slate-400">
          ← Biblioteca
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Tu rutina</h1>
      </header>

      <section className="mt-5">
        <h2 className="font-semibold">¿Cuántos días a la semana vas a ir?</h2>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={`rounded-xl py-3 text-lg font-bold ${n === days ? 'bg-accent text-ink' : 'bg-panel text-slate-300'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Los días van en orden (A, B, C…): si faltas un día, simplemente sigue el que toca.
        </p>
      </section>

      {empty > 0 && (
        <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          {empty === 1 ? 'Un día quedó' : `${empty} días quedaron`} sin ejercicios. Puedes mover ejercicios con el
          selector de cada uno, elegir más en la biblioteca o usar menos días.
        </p>
      )}

      <div className="mt-5 space-y-4">
        {current.map((d, di) => (
          <section key={di} className="rounded-2xl bg-panel p-4">
            <h3 className="text-lg font-bold">
              <span className="text-accent">{dayLabel(di)}</span> · {d.name}
            </h3>
            {d.exerciseIds.length === 0 && <p className="mt-2 text-sm text-slate-500">Sin ejercicios</p>}
            {groupIds(d.exerciseIds).map(([g, ids]) => (
              <div key={g} className="mt-3">
                <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{g}</div>
                {ids.map((id) => {
                  const e = getExercise(id)!
                  return (
                    <div key={id} className="mt-2 flex items-center gap-3">
                      <ExerciseImage id={id} className="h-12 w-12 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{e.es}</div>
                        <div className="truncate text-xs text-slate-500">{e.en}</div>
                      </div>
                      {current.length > 1 && (
                        <select
                          value={di}
                          onChange={(ev) => move(di, id, Number(ev.target.value))}
                          className="rounded-lg border border-line bg-ink px-2 py-1.5 text-sm"
                          aria-label="Mover a otro día"
                        >
                          {current.map((_, i) => (
                            <option key={i} value={i}>
                              {dayLabel(i)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </section>
        ))}
      </div>

      <button onClick={save} className="mt-6 mb-8 w-full rounded-2xl bg-accent py-4 text-lg font-bold text-ink">
        Guardar rutina
      </button>
    </div>
  )
}
