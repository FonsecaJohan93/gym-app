import { useSyncExternalStore } from 'react'
import type { AppState } from '../types'
import { ApiError, fetchRemoteState, pushRemoteState, saveSession, type Session } from './api'

// Cada usuario tiene una copia local (para que funcione con mala señal) que se
// sincroniza con el servidor: se sube unos segundos después de cada cambio y
// al abrir la app gana la versión más reciente.
const LEGACY_KEY = 'gym-app:v1' // datos de antes de tener cuentas
const localKey = (username: string) => `gym-app:v1:${username}`
const PUSH_DELAY_MS = 1500

const EMPTY: AppState = {
  version: 1,
  selection: [],
  plan: null,
  sessions: [],
  swaps: [],
  dismissed: {},
  draft: null,
}

let state: AppState = EMPTY
let session: Session | null = null
let pushTimer: ReturnType<typeof setTimeout> | undefined
let pending = false
const listeners = new Set<() => void>()

export type SyncStatus = 'idle' | 'saving' | 'offline'
let syncStatus: SyncStatus = 'idle'
const syncListeners = new Set<() => void>()
function setSync(s: SyncStatus) {
  syncStatus = s
  syncListeners.forEach((l) => l())
}

function readLocal(key: string): AppState | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

function writeLocal() {
  if (!session) return
  try {
    localStorage.setItem(localKey(session.username), JSON.stringify(state))
  } catch {
    // sin espacio o modo privado: el estado sigue en memoria
  }
}

function emit() {
  listeners.forEach((l) => l())
}

export function getState(): AppState {
  return state
}

export function setState(update: (s: AppState) => AppState): void {
  state = { ...update(state), updatedAt: new Date().toISOString() }
  writeLocal()
  schedulePush()
  emit()
}

function schedulePush() {
  pending = true
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void flush(), PUSH_DELAY_MS)
}

async function flush(keepalive = false) {
  if (!session || !pending) return
  pending = false
  setSync('saving')
  try {
    await pushRemoteState(session.token, state, keepalive)
    setSync('idle')
  } catch (e) {
    pending = true
    setSync('offline')
    if (e instanceof ApiError && e.status === 401) signOut(false)
  }
}

// Al cambiar de app o bloquear el celular, subir lo pendiente
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flush(true)
})
window.addEventListener('online', () => void flush())

/** Abre la sesión: carga la copia local y luego reconcilia con el servidor. */
export async function openSession(s: Session): Promise<void> {
  session = s
  saveSession(s)
  const local = readLocal(localKey(s.username))
  state = local ?? EMPTY
  emit()

  try {
    const remote = await fetchRemoteState(s.token)
    if (remote && (!local || (remote.updatedAt ?? '') > (local.updatedAt ?? ''))) {
      state = { ...EMPTY, ...remote }
      writeLocal()
      emit()
    } else if (!remote) {
      // Cuenta nueva: si había datos de antes de tener cuentas, se los queda
      const legacy = readLocal(LEGACY_KEY)
      if (legacy && !local) {
        state = legacy
        localStorage.removeItem(LEGACY_KEY)
        writeLocal()
        emit()
      }
      if (state !== EMPTY) schedulePush()
    } else if ((local?.updatedAt ?? '') > (remote.updatedAt ?? '')) {
      schedulePush()
    }
    setSync('idle')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) signOut(false)
    else setSync('offline')
  }
}

/** `upload`: false cuando el token ya no sirve (no tiene caso intentar subir). */
export function signOut(upload = true): void {
  if (upload) void flush(true)
  clearTimeout(pushTimer)
  pending = false
  session = null
  saveSession(null)
  state = EMPTY
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}

export function useCurrentUser(): string | null {
  return useSyncExternalStore(subscribe, () => session?.username ?? null)
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      syncListeners.add(l)
      return () => {
        syncListeners.delete(l)
      }
    },
    () => syncStatus,
  )
}

/** Pide al navegador no borrar los datos aunque falte espacio. */
export function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => {})
}

export function exportBackup(): void {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `gym-respaldo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importBackup(file: File): Promise<void> {
  const data = JSON.parse(await file.text())
  if (data?.version !== 1 || !Array.isArray(data.sessions)) {
    throw new Error('El archivo no parece un respaldo de esta app')
  }
  setState(() => ({ ...EMPTY, ...data }))
}
