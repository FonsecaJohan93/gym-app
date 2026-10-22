import type { AppState } from '../types'

export interface Session {
  username: string
  token: string
}

const SESSION_KEY = 'gym-app:session'

export function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function saveSession(s: Session | null): void {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error ?? 'Error de conexión', res.status)
  return body as T
}

export const login = (username: string, password: string) =>
  call<Session>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })

export const register = (username: string, password: string, invite: string) =>
  call<Session>('/api/register', { method: 'POST', body: JSON.stringify({ username, password, invite }) })

export const fetchRemoteState = (token: string) =>
  call<{ state: AppState | null }>('/api/state', {}, token).then((r) => r.state)

export const pushRemoteState = (token: string, state: AppState, keepalive = false) =>
  call<void>('/api/state', { method: 'PUT', body: JSON.stringify(state), keepalive }, token)
