# gym-app

App web móvil (PWA) para seguimiento del gimnasio. La usa el dueño y unos amigos como usuarios de prueba. Toda la interfaz está en español.

- **Producción:** https://gym-app-johan.netlify.app
- **Deploy:** automático en Netlify al hacer push a `main` (build: `npm run build`, publica `dist/`, funciones en `netlify/functions/`). No hace falta la CLI de Netlify.

## Stack

React 19 + TypeScript + Vite + Tailwind v4 (plugin `@tailwindcss/vite`) + `vite-plugin-pwa` + `react-router-dom`. Backend: Netlify Functions + Netlify Blobs.

## Estructura

- `src/data/exercises.json`: biblioteca de 147 ejercicios, generada por `scripts/build_library.py` a partir de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense). Los nombres en español se editan en ese script, no en el JSON. Las imágenes están en `public/ex/<id>/{0,1}.jpg` (480 px, comprimidas).
- `src/lib/store.ts`: el estado de cada usuario (`AppState`) es un solo documento JSON. Hay una copia en localStorage por usuario y se sincroniza con `/api/state` (gana la más reciente según `updatedAt`).
- `src/lib/actions.ts`: todas las mutaciones del estado.
- `src/lib/insights.ts`: regla de reemplazo y sugerencias según el esfuerzo.
- `src/lib/progress.ts`: fuerza estimada (Epley) y progreso por grupo muscular.
- `src/lib/split.ts`: reparto de los ejercicios en 1–6 días.
- `netlify/functions/auth.mts` (`/api/register`, `/api/login`) y `state.mts` (`/api/state`). El código compartido está en `netlify/lib/auth.mts`.

## Decisiones del producto (no cambiarlas sin preguntar)

- Peso, series y repeticiones se registran **por ejercicio, no por serie**.
- Después de cada ejercicio hay dos preguntas: esfuerzo (fácil / justo / muy duro), que es opcional y da la pista de peso, y veredicto (útil / no estoy seguro / no me gustó), que es obligatorio para avanzar.
- Reemplazo: si hay 2 sesiones seguidas con "no me gustó", o 3 seguidas sin "útil", se proponen alternativas del mismo grupo muscular. El usuario aprueba; nunca se cambia automáticamente.
- Los días van en secuencia rotativa (A/B/C…), no por día de la semana.
- La seguridad del login es básica a propósito: scrypt + token HMAC de 90 días. Para crear una cuenta se exige el código de invitación de la variable de entorno `INVITE_CODE`.

## Desarrollo local

- Solo frontend: `npm run dev`.
- Con API: `netlify dev` y abrir Vite directamente en http://localhost:5175, que hace proxy de `/api` a :8888. La URL :8888 rompe los scripts de Vite (tipo MIME vacío).
- En `netlify dev`, una respuesta 403 de una función llega como 404; por eso se usa 400 para errores de validación.
- Variables de entorno (están en Netlify): `AUTH_SECRET`, `INVITE_CODE`.

## Verificación

Antes de hacer push, corre `npm run build`: incluye `tsc -b` y debe terminar sin errores.

## Commits

- **No agregues `Co-Authored-By` ni otras líneas de coautoría en los commits.** El plan gratis de Netlify bloquea el build de repositorios privados si algún autor del commit no es miembro de la cuenta ("Unrecognized Git contributor").
- Los cambios se publican al hacer push a `main`. Si trabajas en otra rama, haz merge a `main` cuando el usuario lo pida.
