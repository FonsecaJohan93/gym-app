import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExercise } from '../lib/exercises'
import { formatPct, groupProgress, type GroupProgress } from '../lib/progress'
import { useAppState } from '../lib/store'
import type { Entry } from '../types'

export default function Results() {
  const { sessions } = useAppState()
  const groups = useMemo(() => groupProgress(sessions), [sessions])
  const withData = groups.filter((g) => g.current != null)
  const overall = withData.length ? withData.reduce((a, g) => a + g.current!, 0) / withData.length : null
  const improving = withData.filter((g) => (g.change4w ?? 0) > 0.5).length

  if (sessions.length === 0) {
    return (
      <div className="px-6 pt-16 text-center">
        <div className="text-5xl">📊</div>
        <h1 className="mt-4 text-2xl font-bold">Tu progreso</h1>
        <p className="mt-2 text-slate-400">Cuando completes entrenamientos, aquí verás cómo sube tu fuerza por grupo muscular.</p>
        <Link to="/" className="mt-6 inline-block rounded-2xl bg-accent px-6 py-3 font-bold text-ink">
          Ir a entrenar
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4">
      <h1 className="pt-8 text-2xl font-bold">Progreso</h1>
      <p className="text-sm text-slate-400">Fuerza estimada comparada con tu primera vez en cada ejercicio.</p>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-panel p-4">
          <div className="text-xs text-slate-400">Fuerza general</div>
          <div className="mt-1 text-3xl font-bold">{overall != null ? formatPct(overall) : '—'}</div>
          <div className="text-xs text-slate-500">promedio de grupos</div>
        </div>
        <div className="rounded-2xl bg-panel p-4">
          <div className="text-xs text-slate-400">Subiendo este mes</div>
          <div className="mt-1 text-3xl font-bold">
            {improving}
            <span className="text-lg font-semibold text-slate-400">/{withData.length}</span>
          </div>
          <div className="text-xs text-slate-500">grupos musculares</div>
        </div>
      </section>

      <div className="mt-4 space-y-3 pb-4">
        {groups.map((g) => (
          <GroupCard key={g.group} g={g} />
        ))}
      </div>

      <p className="mb-6 text-xs leading-relaxed text-slate-500">
        La fuerza estimada combina peso y repeticiones (peso × (1 + reps/30)), así que subir repeticiones con el mismo peso
        también cuenta. En ejercicios sin peso se usan las repeticiones. Cada ejercicio se compara consigo mismo y el grupo
        es el promedio.
      </p>
    </div>
  )
}

function GroupCard({ g }: { g: GroupProgress }) {
  const [open, setOpen] = useState(false)
  const trend = g.change4w == null ? null : g.change4w > 0.5 ? 'up' : g.change4w < -0.5 ? 'down' : 'flat'

  return (
    <section className="rounded-2xl bg-panel">
      <button onClick={() => setOpen((v) => !v)} className="w-full p-4 pb-2 text-left" aria-expanded={open}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{g.group}</h2>
          <span className="text-2xl font-bold tabular-nums">{g.current != null ? formatPct(g.current) : '—'}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {g.sessions} entrenamiento{g.sessions === 1 ? '' : 's'} · {g.exercises.length} ejercicio{g.exercises.length === 1 ? '' : 's'}
          </span>
          {trend && (
            <span>
              <span className={trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-500'}>
                {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'}
              </span>{' '}
              {trend === 'flat' ? 'estable' : formatPct(g.change4w!)} últimas 4 sem.
            </span>
          )}
        </div>
      </button>

      {g.current == null ? (
        <p className="px-4 pb-4 text-sm text-slate-500">Necesitas al menos 2 entrenamientos de este grupo para ver progreso.</p>
      ) : (
        <Sparkline weeks={g.weeks} />
      )}

      {open && (
        <div className="border-t border-line px-4 py-3">
          {g.exercises.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{getExercise(e.id)?.es}</div>
                <div className="text-xs text-slate-500">
                  {fmtEntry(e.first.entry)} → {fmtEntry(e.last.entry)}
                </div>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{e.count >= 2 ? formatPct(e.pct) : 'nuevo'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function fmtEntry(e: Entry): string {
  return e.weight ? `${e.weight} kg × ${e.reps}` : `${e.reps} reps`
}

/** Línea del % semanal del grupo, con línea de referencia en 0 % y toque para ver cada semana. */
function Sparkline({ weeks }: { weeks: { week: string; pct: number }[] }) {
  const [sel, setSel] = useState<number | null>(null)
  const W = 320
  const H = 72
  const pad = { x: 10, y: 10 }
  const vals = weeks.map((w) => w.pct)
  const min = Math.min(0, ...vals)
  const max = Math.max(0, ...vals, 1)
  const x = (i: number) => (weeks.length === 1 ? W / 2 : pad.x + (i * (W - 2 * pad.x)) / (weeks.length - 1))
  const y = (v: number) => H - pad.y - ((v - min) / (max - min)) * (H - 2 * pad.y)
  const path = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(w.pct).toFixed(1)}`).join(' ')
  const active = sel ?? weeks.length - 1
  const label = (wk: string) => new Date(`${wk}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })

  return (
    <div className="px-4 pb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-[72px] w-full overflow-visible" role="img" aria-label="Progreso semanal">
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--color-line)" strokeDasharray="3 4" />
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(active)} cy={y(weeks[active].pct)} r={4} fill="var(--color-accent)" stroke="var(--color-panel)" strokeWidth={2} />
        {weeks.map((w, i) => (
          // zona de toque más ancha que el punto
          <rect
            key={w.week}
            x={x(i) - W / Math.max(weeks.length, 2) / 2}
            y={0}
            width={W / Math.max(weeks.length, 2)}
            height={H}
            fill="transparent"
            onClick={() => setSel(i)}
            onMouseEnter={() => setSel(i)}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>{label(weeks[0].week)}</span>
        <span className="text-slate-300">
          Semana del {label(weeks[active].week)}: <b className="tabular-nums">{formatPct(weeks[active].pct)}</b>
        </span>
      </div>
    </div>
  )
}
