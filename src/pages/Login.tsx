import { useState } from 'react'
import { login, register } from '../lib/api'
import { openSession } from '../lib/store'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const s = mode === 'login' ? await login(username, password) : await register(username, password, invite)
      await openSession(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-line bg-panel px-4 py-3.5 text-base outline-none focus:border-accent'

  return (
    <div className="mx-auto min-h-dvh max-w-sm px-6 pt-16">
      <img src="/pwa-192x192.png" alt="" className="mx-auto h-20 w-20 rounded-2xl" />
      <h1 className="mt-5 text-center text-3xl font-bold">Gym</h1>
      <p className="mt-1 text-center text-slate-400">Tu rutina, a tu medida</p>

      <div className="mt-8 grid grid-cols-2 rounded-xl bg-panel p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`rounded-lg py-2.5 font-semibold ${mode === m ? 'bg-accent text-ink' : 'text-slate-400'}`}
          >
            {m === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuario"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          required
          className={input}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          className={input}
        />
        {mode === 'register' && (
          <input
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="Código de invitación"
            autoCapitalize="none"
            autoCorrect="off"
            required
            className={input}
          />
        )}
        {error && <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-ink disabled:opacity-60">
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      {mode === 'register' && (
        <p className="mt-4 text-center text-xs text-slate-500">Pídele el código de invitación a quien te compartió la app.</p>
      )}
    </div>
  )
}
