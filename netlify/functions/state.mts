import type { Config } from '@netlify/functions'
import { json, states, userFromRequest } from '../lib/auth.mts'

const MAX_BYTES = 2_000_000

/** Los datos de cada usuario se guardan como un solo documento JSON. */
export default async (req: Request) => {
  const username = userFromRequest(req)
  if (!username) return json({ error: 'Sesión vencida, vuelve a entrar' }, 401)

  if (req.method === 'GET') {
    return json({ state: await states().get(username, { type: 'json' }) })
  }
  if (req.method === 'PUT') {
    const text = await req.text()
    if (text.length > MAX_BYTES) return json({ error: 'Datos demasiado grandes' }, 413)
    try {
      JSON.parse(text)
    } catch {
      return json({ error: 'JSON inválido' }, 400)
    }
    await states().set(username, text)
    return new Response(null, { status: 204 })
  }
  return json({ error: 'Método no permitido' }, 405)
}

export const config: Config = { path: '/api/state' }
