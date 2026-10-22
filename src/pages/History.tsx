import { useRef, useState } from 'react'
import { getExercise } from '../lib/exercises'
import { dayLabel } from '../lib/split'
import { deleteSession } from '../lib/actions'
import { relativeDay, EFFORT_LABEL, VERDICT_LABEL } from '../lib/insights'
import { exportBackup, importBackup, signOut, useAppState, useCurrentUser, useSyncStatus } from '../lib/store'

export default function History() {
  const { sessions, swaps } = useAppState()
  const user = useCurrentUser()
  const sync = useSyncStatus()
  const [open, setOpen] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const list = [...sessions].reverse()

  const onImport = async (f: File | undefined) => {
    if (!f || !confirm('Esto reemplaza todos los datos de este celular con los del respaldo. ¿Continuar?')) return
    try {
      await importBackup(f)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="px-4">
      <h1 className="pt-8 text-2xl font-bold">Historial</h1>
      <p className="text-sm text-slate-400">
        {sessions.length} entrenamiento{sessions.length === 1 ? '' : 's'}
        {swaps.length > 0 && ` · ${swaps.length} cambio${swaps.length === 1 ? '' : 's'} de ejercicio`}
      </p>

      <div className="mt-4 space-y-2">
        {list.length === 0 && <p className="py-8 text-center text-slate-500">Aquí aparecerán tus entrenamientos.</p>}
        {list.map((s) => (
          <div key={s.id} className="rounded-2xl bg-panel">
            <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center p-4 text-left">
              <div className="flex-1">
                <div className="font-semibold">
                  {dayLabel(s.dayIndex)} · {s.dayName}
                </div>
                <div className="text-sm text-slate-400">
                  {relativeDay(s.date)} · {new Date(s.date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
              <div className="flex gap-0.5 text-sm">
                {s.entries.map((e, i) => (
                  <span key={i}>{e.verdict ? VERDICT_LABEL[e.verdict].split(' ')[0] : '·'}</span>
                ))}
              </div>
            </button>
            {open === s.id && (
              <div className="border-t border-line px-4 pt-2 pb-4">
                {s.entries.map((e) => (
                  <div key={e.exerciseId} className="py-2">
                    <div className="font-medium">{getExercise(e.exerciseId)?.es ?? e.exerciseId}</div>
                    <div className="text-sm text-slate-400">
                      {e.skipped
                        ? 'Saltado'
                        : `${e.weight != null ? `${e.weight} kg · ` : ''}${e.sets}×${e.reps}${e.effort ? ` · ${EFFORT_LABEL[e.effort]}` : ''}${
                            e.verdict ? ` · ${VERDICT_LABEL[e.verdict]}` : ''
                          }`}
                    </div>
                    {e.comment && <div className="text-sm text-slate-300 italic">“{e.comment}”</div>}
                  </div>
                ))}
                <button
                  onClick={() => confirm('¿Borrar este entrenamiento del historial?') && deleteSession(s.id)}
                  className="mt-2 text-sm text-rose-400"
                >
                  Borrar entrenamiento
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Cuenta</h2>
            <p className="text-sm text-slate-400">
              {user} ·{' '}
              {sync === 'offline' ? 'sin conexión, se guardará al volver' : sync === 'saving' ? 'guardando…' : 'guardado en la nube'}
            </p>
          </div>
          <button
            onClick={() => confirm('¿Cerrar sesión en este celular?') && signOut()}
            className="rounded-xl border border-line px-4 py-2 text-sm text-slate-300"
          >
            Salir
          </button>
        </div>
      </section>

      <section className="mt-3 mb-4 rounded-2xl border border-line p-4">
        <h2 className="font-semibold">Respaldo</h2>
        <p className="mt-1 text-sm text-slate-400">
          Tus datos se guardan en tu cuenta. Si quieres, también puedes descargar una copia.
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={exportBackup} className="flex-1 rounded-xl bg-panel py-3 font-medium">
            Descargar respaldo
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl bg-panel py-3 font-medium">
            Restaurar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              onImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
