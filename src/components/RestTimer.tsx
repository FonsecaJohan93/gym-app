import { useEffect, useRef, useState } from 'react'
import { adjustRest, endRest } from '../lib/actions'
import { beep } from '../lib/sound'

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Cuenta regresiva del descanso. El tiempo sale de `endsAt` (hora real), así que
 * sigue contando aunque el celular se bloquee; al volver muestra cuánto pasó de más.
 * Mientras cuenta, pide mantener la pantalla encendida.
 */
export function RestTimer({ endsAt, seconds }: { endsAt: string; seconds: number }) {
  const end = new Date(endsAt).getTime()
  const [now, setNow] = useState(() => Date.now())
  const remaining = (end - now) / 1000
  const finished = remaining <= 0
  const alerted = useRef<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  // Pitido una sola vez por descanso, si la app está a la vista cuando termina
  useEffect(() => {
    if (finished && alerted.current !== endsAt) {
      alerted.current = endsAt
      if (document.visibilityState === 'visible' && remaining > -3) beep()
    }
  }, [finished, endsAt, remaining])

  // Pantalla encendida mientras cuenta (Android y iPhone recientes)
  useEffect(() => {
    if (finished || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    const request = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => {})
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [finished])

  const progress = finished ? 1 : 1 - remaining / seconds

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
      <div
        className={`mx-auto max-w-lg rounded-t-3xl p-5 shadow-[0_-8px_30px_rgb(15_23_42/0.12)] transition-colors ${
          finished ? 'animate-[flash_1s_ease-in-out_3] bg-accent text-white' : 'bg-panel'
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className={`text-sm font-semibold ${finished ? 'text-white' : 'text-slate-600'}`}>
            {finished ? '¡A la siguiente serie!' : 'Descanso'}
          </span>
          {finished && <span className="text-sm text-white/90">pasaste +{formatClock(-remaining)}</span>}
        </div>
        <div className="mt-1 text-center text-6xl font-bold tabular-nums">{finished ? '0:00' : formatClock(remaining)}</div>
        {!finished && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {finished ? (
            <button onClick={endRest} className="col-span-3 rounded-xl bg-white py-3.5 font-bold text-accent">
              Listo
            </button>
          ) : (
            <>
              <button onClick={() => adjustRest(-15)} className="rounded-xl border border-line py-3 font-semibold text-slate-700">
                −15 s
              </button>
              <button onClick={() => adjustRest(15)} className="rounded-xl border border-line py-3 font-semibold text-slate-700">
                +15 s
              </button>
              <button onClick={endRest} className="rounded-xl bg-ink py-3 font-semibold text-slate-800">
                Saltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
