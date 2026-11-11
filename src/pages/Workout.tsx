import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getExercise } from '../lib/exercises'
import { dayLabel } from '../lib/split'
import {
  addToWorkout,
  cancelWorkout,
  getSettings,
  startRest,
  endWorkoutEarly,
  finishWorkout,
  postponeCurrent,
  setDraftIndex,
  swapInWorkout,
  updateEntry,
  workoutOrder,
} from '../lib/actions'
import { addRecommendations, effortHint, lastEntry, relativeDay, EFFORT_LABEL, VERDICT_LABEL } from '../lib/insights'
import { useAppState } from '../lib/store'
import { ExerciseImage } from '../components/ExerciseImage'
import { ExercisePicker } from '../components/ExercisePicker'
import { formatClock, RestTimer } from '../components/RestTimer'
import { primeAudio } from '../lib/sound'
import type { Effort, Exercise, Verdict } from '../types'

const VERDICTS: { v: Verdict; on: string }[] = [
  { v: 'util', on: 'bg-emerald-500 text-white border-emerald-500' },
  { v: 'nose', on: 'bg-amber-400 text-slate-900 border-amber-400' },
  { v: 'no', on: 'bg-rose-500 text-white border-rose-500' },
]

export default function Workout() {
  const state = useAppState()
  const { draft, plan, sessions } = state
  const navigate = useNavigate()
  const [picker, setPicker] = useState<'add' | 'swap' | null>(null)
  // Ejercicio elegido en la hoja, esperando "¿para siempre o solo hoy?"
  const [pending, setPending] = useState<{ kind: 'add' | 'swap'; exercise: Exercise; fromId?: string } | null>(null)
  const currentId = draft && plan ? workoutOrder(draft, plan)[draft.index] : undefined
  // Cada ejercicio nuevo arranca arriba, con la foto a la vista
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [draft?.index, currentId])
  if (!draft || !plan) return <Navigate to="/" replace />

  const day = plan.days[draft.dayIndex]
  const ids = workoutOrder(draft, plan)
  const total = ids.length
  const done = draft.index >= total

  const exit = () => {
    if (confirm('¿Descartar este entrenamiento? Lo que llevas no se guardará.')) {
      cancelWorkout()
      navigate('/')
    }
  }

  const settings = getSettings(state)
  const overlays = (
    <>
      {draft.rest && <RestTimer key={draft.rest.endsAt} endsAt={draft.rest.endsAt} seconds={draft.rest.seconds} />}
      {picker && (
        <ExercisePicker
          title={picker === 'add' ? 'Agregar ejercicio' : 'Cambiar por otro'}
          replacing={picker === 'swap' && currentId ? getExercise(currentId) : undefined}
          recommendations={picker === 'add' ? addRecommendations(state, ids) : undefined}
          exclude={ids}
          onClose={() => setPicker(null)}
          onPick={(exercise) => {
            setPending({ kind: picker, exercise, fromId: picker === 'swap' ? currentId : undefined })
            setPicker(null)
          }}
        />
      )}
      {pending && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={() => setPending(null)}>
          <div className="pb-safe mx-auto w-full max-w-lg rounded-t-3xl bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-semibold">
              {pending.kind === 'add'
                ? `¿Agregar ${pending.exercise.es} a ${dayLabel(draft.dayIndex)} para siempre?`
                : `¿Cambiar ${getExercise(pending.fromId!)?.es} por ${pending.exercise.es} en tu rutina para siempre?`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {pending.kind === 'add'
                ? `Si eliges "Solo hoy", queda en el entrenamiento de hoy pero no en ${day.name}.`
                : 'Si eliges "Solo hoy", la próxima vez vuelve el ejercicio de siempre.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[false, true].map((permanent) => (
                <button
                  key={String(permanent)}
                  onClick={() => {
                    if (pending.kind === 'add') addToWorkout(pending.exercise.id, permanent)
                    else swapInWorkout(pending.fromId!, pending.exercise.id, permanent)
                    setPending(null)
                  }}
                  className={`rounded-xl py-3.5 font-semibold ${permanent ? 'bg-accent text-white' : 'border border-line text-slate-800'}`}
                >
                  {permanent ? 'Sí, siempre' : 'Solo hoy'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (done) {
    return (
      <div className="px-4">
        {overlays}
        <h1 className="pt-8 text-3xl font-bold">¡Listo! 💪</h1>
        <p className="text-slate-600">
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
                  <div className="text-sm text-slate-600">
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
        <button onClick={() => setPicker('add')} className="mt-3 w-full rounded-xl border border-dashed border-line py-3 text-slate-700">
          + Agregar otro ejercicio
        </button>
        <button
          onClick={() => {
            finishWorkout()
            navigate('/')
          }}
          className="mt-6 w-full rounded-2xl bg-accent py-4 text-xl font-bold text-white"
        >
          Guardar entrenamiento
        </button>
        <button onClick={exit} className="mt-3 mb-8 w-full py-3 text-slate-600">
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
  const setsDone = draft.setsDone?.[id] ?? 0

  return (
    <div className="pb-safe">
      {overlays}
      <div className="flex items-center gap-3 px-4 pt-3">
        <button onClick={exit} className="text-2xl text-slate-600" aria-label="Salir">
          ✕
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel">
          <div className="h-full bg-accent transition-all" style={{ width: `${(draft.index / total) * 100}%` }} />
        </div>
        <span className="text-sm text-slate-600">
          {draft.index + 1}/{total}
        </span>
        <button
          onClick={endWorkoutEarly}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-700 active:bg-panel"
        >
          Terminar por hoy
        </button>
      </div>

      <ExerciseImage key={id} id={id} animate className="mx-4 mt-3 aspect-[4/3] rounded-2xl" />

      <div className="px-4">
        <h1 className="mt-3 text-[28px] leading-tight font-bold">{ex.es}</h1>
        <p className="text-sm text-slate-600">{ex.en}</p>
        <p className="mt-1 text-xs text-slate-500">
          {ex.group} · {ex.equipment}
          {ex.secondary.length > 0 && ` · también: ${ex.secondary.join(', ')}`}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <button onClick={() => setPicker('swap')} className="rounded-xl border border-line py-2.5 text-slate-800">
            🔄 Cambiar por otro
          </button>
          <button onClick={() => setPicker('add')} className="rounded-xl border border-line py-2.5 text-slate-800">
            + Agregar ejercicio
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-panel p-3 text-sm">
          {last ? (
            <>
              <div className="text-slate-600">La última vez ({relativeDay(last.date)})</div>
              <div className="mt-0.5 text-base font-semibold">
                {last.weight != null ? `${last.weight} kg · ` : ''}
                {last.sets}×{last.reps}
                {last.effort && <span className="font-normal text-slate-600"> · {EFFORT_LABEL[last.effort]}</span>}
                {last.verdict && <span className="font-normal text-slate-600"> · {VERDICT_LABEL[last.verdict]}</span>}
              </div>
              {last.comment && <div className="mt-1 text-slate-700 italic">“{last.comment}”</div>}
              {hint && <div className="mt-2 text-accent">{hint}</div>}
            </>
          ) : (
            <div className="text-slate-600">Primera vez con este ejercicio.</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stepper label="Peso (kg)" value={entry.weight} step={2.5} onChange={(weight) => set({ weight })} decimal />
          <Stepper label="Series" value={entry.sets} step={1} onChange={(sets) => set({ sets })} />
          <Stepper label="Reps" value={entry.reps} step={1} onChange={(reps) => set({ reps })} />
        </div>

        {settings.restEnabled && (
          <button
            onClick={() => {
              primeAudio() // el toque "desbloquea" el sonido para el pitido final
              startRest(id)
            }}
            className="mt-3 flex w-full items-center justify-between rounded-xl border-2 border-accent bg-accent/10 px-4 py-3 text-left active:scale-[0.99]"
          >
            <span>
              <span className="block font-semibold text-accent">⏱ Serie lista · descansar {formatClock(settings.restSeconds)}</span>
              <span className="text-xs text-slate-600">
                Llevas {setsDone} de {entry.sets ?? '?'} series
              </span>
            </span>
            <span className="text-2xl font-bold text-accent tabular-nums">
              {setsDone}/{entry.sets ?? '?'}
            </span>
          </button>
        )}

        <textarea
          value={entry.comment}
          onChange={(e) => set({ comment: e.target.value })}
          placeholder="Comentarios (asiento en 4, me dolió el hombro…)"
          rows={2}
          className="mt-3 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base outline-none focus:border-accent"
        />

        <h2 className="mt-4 text-sm font-semibold text-slate-700">¿Qué tan duro estuvo?</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(EFFORT_LABEL) as Effort[]).map((k) => (
            <button
              key={k}
              onClick={() => set({ effort: entry.effort === k ? null : k })}
              className={`rounded-xl border py-3 font-medium ${
                entry.effort === k ? 'border-sky-500 bg-sky-500 text-white' : 'border-line text-slate-700'
              }`}
            >
              {EFFORT_LABEL[k]}
            </button>
          ))}
        </div>

        <h2 className="mt-4 text-sm font-semibold text-slate-700">¿Te pareció útil este ejercicio?</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {VERDICTS.map(({ v, on }) => (
            <button
              key={v}
              onClick={() => set({ verdict: v, skipped: false })}
              className={`rounded-xl border px-1 py-3 text-sm leading-tight font-semibold ${
                entry.verdict === v ? on : 'border-line text-slate-700'
              }`}
            >
              {VERDICT_LABEL[v]}
            </button>
          ))}
        </div>

        <button
          disabled={!entry.verdict}
          onClick={() => setDraftIndex(draft.index + 1)}
          className="mt-5 w-full rounded-2xl bg-accent py-4 text-lg font-bold text-white disabled:bg-panel disabled:text-slate-500"
        >
          {entry.verdict ? (draft.index + 1 === total ? 'Terminar' : 'Siguiente ejercicio →') : 'Califica el ejercicio para seguir'}
        </button>
        <div className="mt-2 mb-6 flex justify-between text-sm text-slate-600">
          <button disabled={draft.index === 0} onClick={() => setDraftIndex(draft.index - 1)} className="py-2 disabled:opacity-30">
            ← Anterior
          </button>
          {draft.index < total - 1 ? (
            // Máquina ocupada: se hace al final
            <button onClick={postponeCurrent} className="py-2 font-medium text-slate-800">
              Para luego ⤵
            </button>
          ) : (
            <button
              onClick={() => {
                set({ skipped: true, verdict: null })
                setDraftIndex(draft.index + 1)
              }}
              className="py-2"
            >
              Hoy no lo hice →
            </button>
          )}
        </div>
        {/* espacio para que el temporizador no tape los botones */}
        {draft.rest && <div className="h-64" />}
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
      <div className="text-xs text-slate-600">{label}</div>
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
