import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getExercise, groupIds } from '../lib/exercises'
import { dayLabel } from '../lib/split'
import { acceptSwap, dismissProposal, setNextDay, startWorkout } from '../lib/actions'
import { candidatesFor, lastEntry, pendingProposals, relativeDay, VERDICT_LABEL, type Proposal } from '../lib/insights'
import { useAppState } from '../lib/store'
import { ExerciseImage } from '../components/ExerciseImage'

export default function Home() {
  const state = useAppState()
  const { plan, draft, sessions } = state
  const navigate = useNavigate()

  if (!plan) {
    return (
      <div className="px-6 pt-16 text-center">
        <div className="text-6xl">🏋️</div>
        <h1 className="mt-4 text-3xl font-bold">Tu rutina, a tu medida</h1>
        <p className="mt-3 text-slate-400">
          Elige tus ejercicios, dinos cuántos días vas, y después de cada ejercicio cuéntanos qué tal te pareció. Si algo
          no te funciona, te proponemos otro del mismo grupo muscular.
        </p>
        <Link to="/biblioteca" className="mt-8 inline-block rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-ink">
          Elegir ejercicios
        </Link>
      </div>
    )
  }

  const dayIndex = plan.nextDay
  const day = plan.days[dayIndex]
  const proposals = pendingProposals(state)
  const lastSession = sessions[sessions.length - 1]

  const start = () => {
    if (!draft) startWorkout(dayIndex)
    navigate('/entreno')
  }

  return (
    <div className="px-4">
      <header className="pt-4">
        <p className="pt-4 text-sm text-slate-400">
          {lastSession ? `Último entrenamiento: ${relativeDay(lastSession.date)} (${lastSession.dayName})` : 'Aún no has entrenado'}
        </p>
        <h1 className="text-3xl font-bold">
          Hoy toca <span className="text-accent">{dayLabel(dayIndex)}</span>
        </h1>
        <p className="text-lg text-slate-300">{day.name}</p>
      </header>

      {plan.days.length > 1 && (
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {plan.days.map((d, i) => (
            <button
              key={i}
              disabled={!!draft}
              onClick={() => setNextDay(i)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                i === dayIndex ? 'border-accent bg-accent/15 text-accent' : 'border-line text-slate-300 disabled:opacity-40'
              }`}
            >
              {dayLabel(i)} · {d.name}
            </button>
          ))}
        </div>
      )}

      {proposals.length > 0 && (
        <div className="mt-5 space-y-3">
          {proposals.map((p) => (
            <ProposalCard key={p.exercise.id} proposal={p} />
          ))}
        </div>
      )}

      <section className="mt-5 rounded-2xl bg-panel p-4">
        {day.exerciseIds.length === 0 && <p className="text-slate-400">Este día no tiene ejercicios.</p>}
        {groupIds(day.exerciseIds).map(([g, ids]) => (
          <div key={g} className="mb-3 last:mb-0">
            <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{g}</div>
            {ids.map((id) => {
              const e = getExercise(id)!
              const last = lastEntry(sessions, id)
              return (
                <div key={id} className="mt-2 flex items-center gap-3">
                  <ExerciseImage id={id} className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="leading-tight font-semibold">{e.es}</div>
                    <div className="text-xs text-slate-500">
                      {last
                        ? `${last.weight != null ? `${last.weight} kg · ` : ''}${last.sets ?? '?'}×${last.reps ?? '?'}${
                            last.verdict ? ` · ${VERDICT_LABEL[last.verdict].split(' ')[0]}` : ''
                          }`
                        : 'Nuevo'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </section>

      {day.exerciseIds.length > 0 && (
        <button onClick={start} className="mt-5 w-full rounded-2xl bg-accent py-4 text-xl font-bold text-ink">
          {draft ? 'Continuar entrenamiento' : 'Empezar'}
        </button>
      )}

      <div className="mt-6 mb-4 flex justify-center gap-6 text-sm text-slate-400">
        <Link to="/biblioteca">Editar ejercicios</Link>
        <Link to="/rutina">Cambiar días</Link>
      </div>
    </div>
  )
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const state = useAppState()
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const { exercise, reason } = proposal
  const candidates = candidatesFor(state, exercise.id)
  const shown = showAll ? candidates : candidates.slice(0, 3)

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm text-amber-200">
        {reason === 'no'
          ? 'Las últimas 2 veces marcaste que no te gustó'
          : 'Las últimas 3 veces no lo marcaste como útil'}
      </p>
      <p className="mt-0.5 text-lg font-semibold">{exercise.es}</p>
      {!open ? (
        <div className="mt-3 flex gap-2">
          <button onClick={() => setOpen(true)} className="flex-1 rounded-xl bg-amber-400 py-2.5 font-semibold text-ink">
            Ver alternativas
          </button>
          <button onClick={() => dismissProposal(exercise.id)} className="rounded-xl border border-line px-4 py-2.5 text-slate-300">
            Mantener
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-slate-300">Otros ejercicios de {exercise.group.toLowerCase()}:</p>
          {candidates.length === 0 && <p className="text-sm text-slate-400">No hay más ejercicios de este grupo.</p>}
          {shown.map((c) => {
            const last = lastEntry(state.sessions, c.id)
            return (
              <button
                key={c.id}
                onClick={() => acceptSwap(exercise.id, c.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-panel p-2 text-left active:scale-[0.99]"
              >
                <ExerciseImage id={c.id} className="h-14 w-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="leading-tight font-semibold">{c.es}</div>
                  <div className="text-xs text-slate-500">
                    {c.equipment}
                    {last?.verdict ? ` · antes: ${VERDICT_LABEL[last.verdict]}` : ' · nunca probado'}
                  </div>
                </div>
                <span className="text-sm font-semibold text-accent">Usar</span>
              </button>
            )
          })}
          <div className="flex gap-4 pt-1 text-sm">
            {!showAll && candidates.length > 3 && (
              <button onClick={() => setShowAll(true)} className="text-slate-300">
                Ver todos ({candidates.length})
              </button>
            )}
            <button onClick={() => dismissProposal(exercise.id)} className="text-slate-400">
              Mejor lo mantengo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
