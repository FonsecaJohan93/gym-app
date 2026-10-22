import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getExercise } from '../lib/exercises'
import { dayLabel } from '../lib/split'
import { cancelWorkout, finishWorkout, setDraftIndex, updateEntry } from '../lib/actions'
import { effortHint, lastEntry, relativeDay, EFFORT_LABEL, VERDICT_LABEL } from '../lib/insights'
import { useAppState } from '../lib/store'
import { ExerciseImage } from '../components/ExerciseImage'
import type { Effort, Verdict } from '../types'

const VERDICTS: { v: Verdict; on: string }[] = [
  { v: 'util', on: 'bg-emerald-500 text-ink border-emerald-500' },
  { v: 'nose', on: 'bg-amber-400 text-ink border-amber-400' },
  { v: 'no', on: 'bg-rose-500 text-white border-rose-500' },
]

export default function Workout() {
  const { draft, plan, sessions } = useAppState()
  const navigate = useNavigate()
  // Cada ejercicio nuevo arranca arriba, con la foto a la vista
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [draft?.index])
  if (!draft || !plan) return <Navigate to="/" replace />

  const day = plan.days[draft.dayIndex]
  const ids = day.exerciseIds
  const total = ids.length
  const done = draft.index >= total

  const exit = () => {
    if (confirm('¿Descartar este entrenamiento? Lo que llevas no se guardará.')) {
      cancelWorkout()
      navigate('/')
    }
  }

  if (done) {
    return (
      <div className="px-4">
        <h1 className="pt-8 text-3xl font-bold">¡Listo! 💪</h1>
        <p className="text-slate-400">
          {dayLabel(draft.dayIndex)} · {day.name}
        </p>
        <div className="mt-5 space-y-2">
          {ids.map((id, i) => {
            const e = draft.entries[id]
            return (
              <button
                key={id}
                onClick={() => setDraftIndex(i)}
                className="flex w-full items-center gap-3 rounded-xl bg-panel p-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{getExercise(id)?.es}</div>
                  <div className="text-sm text-slate-400">
                    {e.skipped
                      ? 'Saltado'
                      : `${e.weight != null ? `${e.weight} kg · ` : ''}${e.sets}×${e.reps}${e.effort ? ` · ${EFFORT_LABEL[e.effort]}` : ''}`}
                  </div>
                </div>
                <span className="text-sm">{e.verdict ? VERDICT_LABEL[e.verdict] : ''}</span>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => {
            finishWorkout()
            navigate('/')
          }}
          className="mt-6 w-full rounded-2xl bg-accent py-4 text-xl font-bold text-ink"
        >
          Guardar entrenamiento
        </button>
        <button onClick={exit} className="mt-3 mb-8 w-full py-3 text-slate-400">
          Descartar
        </button>
      </div>
    )
  }

  const id = ids[draft.index]
  const ex = getExercise(id)!
  const entry = draft.entries[id]
  const last = lastEntry(sessions, id)
  const hint = effortHint(last)
  const set = (patch: Parameters<typeof updateEntry>[1]) => updateEntry(id, patch)

  return (
    <div className="pb-safe">
      <div className="flex items-center gap-3 px-4 pt-3">
        <button onClick={exit} className="text-2xl text-slate-400" aria-label="Salir">
          ✕
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel">
          <div className="h-full bg-accent transition-all" style={{ width: `${(draft.index / total) * 100}%` }} />
        </div>
        <span className="text-sm text-slate-400">
          {draft.index + 1}/{total}
        </span>
      </div>

      <ExerciseImage key={id} id={id} animate className="mx-4 mt-3 aspect-[4/3] rounded-2xl" />

      <div className="px-4">
        <h1 className="mt-3 text-[28px] leading-tight font-bold">{ex.es}</h1>
        <p className="text-sm text-slate-400">{ex.en}</p>
        <p className="mt-1 text-xs text-slate-500">
          {ex.group} · {ex.equipment}
          {ex.secondary.length > 0 && ` · también: ${ex.secondary.join(', ')}`}
        </p>

        <div className="mt-4 rounded-2xl bg-panel p-3 text-sm">
          {last ? (
            <>
              <div className="text-slate-400">La última vez ({relativeDay(last.date)})</div>
              <div className="mt-0.5 text-base font-semibold">
                {last.weight != null ? `${last.weight} kg · ` : ''}
                {last.sets}×{last.reps}
                {last.effort && <span className="font-normal text-slate-400"> · {EFFORT_LABEL[last.effort]}</span>}
                {last.verdict && <span className="font-normal text-slate-400"> · {VERDICT_LABEL[last.verdict]}</span>}
              </div>
              {last.comment && <div className="mt-1 text-slate-300 italic">“{last.comment}”</div>}
              {hint && <div className="mt-2 text-accent">{hint}</div>}
            </>
          ) : (
            <div className="text-slate-400">Primera vez con este ejercicio.</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stepper label="Peso (kg)" value={entry.weight} step={2.5} onChange={(weight) => set({ weight })} decimal />
          <Stepper label="Series" value={entry.sets} step={1} onChange={(sets) => set({ sets })} />
          <Stepper label="Reps" value={entry.reps} step={1} onChange={(reps) => set({ reps })} />
        </div>

        <textarea
          value={entry.comment}
          onChange={(e) => set({ comment: e.target.value })}
          placeholder="Comentarios (asiento en 4, me dolió el hombro…)"
          rows={2}
          className="mt-3 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base outline-none focus:border-accent"
        />

        <h2 className="mt-4 text-sm font-semibold text-slate-300">¿Qué tan duro estuvo?</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(EFFORT_LABEL) as Effort[]).map((k) => (
            <button
              key={k}
              onClick={() => set({ effort: entry.effort === k ? null : k })}
              className={`rounded-xl border py-3 font-medium ${
                entry.effort === k ? 'border-sky-400 bg-sky-400 text-ink' : 'border-line text-slate-300'
              }`}
            >
              {EFFORT_LABEL[k]}
            </button>
          ))}
        </div>

        <h2 className="mt-4 text-sm font-semibold text-slate-300">¿Te pareció útil este ejercicio?</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {VERDICTS.map(({ v, on }) => (
            <button
              key={v}
              onClick={() => set({ verdict: v, skipped: false })}
              className={`rounded-xl border px-1 py-3 text-sm leading-tight font-semibold ${
                entry.verdict === v ? on : 'border-line text-slate-300'
              }`}
            >
              {VERDICT_LABEL[v]}
            </button>
          ))}
        </div>

        <button
          disabled={!entry.verdict}
          onClick={() => setDraftIndex(draft.index + 1)}
          className="mt-5 w-full rounded-2xl bg-accent py-4 text-lg font-bold text-ink disabled:bg-panel disabled:text-slate-500"
        >
          {entry.verdict ? (draft.index + 1 === total ? 'Terminar' : 'Siguiente ejercicio →') : 'Califica el ejercicio para seguir'}
        </button>
        <div className="mt-2 mb-6 flex justify-between text-sm text-slate-400">
          <button disabled={draft.index === 0} onClick={() => setDraftIndex(draft.index - 1)} className="py-2 disabled:opacity-30">
            ← Anterior
          </button>
          <button
            onClick={() => {
              set({ skipped: true, verdict: null })
              setDraftIndex(draft.index + 1)
            }}
            className="py-2"
          >
            Hoy no lo hice →
          </button>
        </div>
      </div>
    </div>
  )
}

function Stepper({
  label,
  value,
  step,
  onChange,
  decimal = false,
}: {
  label: string
  value: number | null
  step: number
  onChange: (v: number | null) => void
  decimal?: boolean
}) {
  const bump = (d: number) => onChange(Math.max(0, Math.round(((value ?? 0) + d) * 10) / 10))
  return (
    <div className="rounded-xl bg-panel p-2 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <input
        type="number"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value ?? ''}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value.replace(',', '.')))}
        className="w-full bg-transparent text-center text-2xl font-bold outline-none"
      />
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button onClick={() => bump(-step)} className="rounded-lg bg-ink py-1.5 text-lg">
          −
        </button>
        <button onClick={() => bump(step)} className="rounded-lg bg-ink py-1.5 text-lg">
          +
        </button>
      </div>
    </div>
  )
}
