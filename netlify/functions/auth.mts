import type { Config } from '@netlify/functions'
import { checkPassword, hashPassword, json, makeToken, normalizeUsername, users, type UserRecord } from '../lib/auth.mts'

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const action = new URL(req.url).pathname.split('/').pop()
  const body = await req.json().catch(() => ({}))
  const username = normalizeUsername(body.username)
  const password = typeof body.password === 'string' ? body.password : ''

  if (!username) return json({ error: 'Usuario de 3 a 20 caracteres: letras, números, punto, guion o guion bajo' }, 400)
  if (password.length < 4) return json({ error: 'La contraseña debe tener al menos 4 caracteres' }, 400)

  if (action === 'register') {
    const invite = Netlify.env.get('INVITE_CODE')
    if (invite && String(body.invite ?? '').trim().toLowerCase() !== invite.toLowerCase()) {
      return json({ error: 'Código de invitación incorrecto' }, 400)
    }
    if (await users().get(username)) return json({ error: 'Ese usuario ya existe' }, 409)
    const rec: UserRecord = { username, ...hashPassword(password), createdAt: new Date().toISOString() }
    await users().setJSON(username, rec)
    return json({ username, token: makeToken(username) })
  }

  if (action === 'login') {
    const rec = (await users().get(username, { type: 'json' })) as UserRecord | null
    if (!rec || !checkPassword(password, rec)) return json({ error: 'Usuario o contraseña incorrectos' }, 401)
    return json({ username, token: makeToken(username) })
  }

  return json({ error: 'No encontrado' }, 404)
}

export const config: Config = { path: ['/api/register', '/api/login'] }
