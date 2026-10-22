import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EXERCISES, GROUPS } from '../lib/exercises'
import { toggleSelection } from '../lib/actions'
import { useAppState } from '../lib/store'
import { ExerciseImage } from '../components/ExerciseImage'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Library() {
  const { selection } = useAppState()
  const navigate = useNavigate()
  const [group, setGroup] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [onlySelected, setOnlySelected] = useState(false)

  const selected = useMemo(() => new Set(selection), [selection])
  const list = useMemo(() => {
    const q = normalize(query.trim())
    return EXERCISES.filter(
      (e) =>
        (!group || e.group === group) &&
        (!onlySelected || selected.has(e.id)) &&
        (!q || normalize(e.es).includes(q) || normalize(e.en).includes(q)),
    )
  }, [group, query, onlySelected, selected])

  const countByGroup = (g: string) => EXERCISES.filter((e) => e.group === g && selected.has(e.id)).length

  return (
    <div>
      <header className="sticky top-0 z-10 bg-ink/95 px-4 pb-3 backdrop-blur">
        <h1 className="pt-4 text-2xl font-bold">Biblioteca</h1>
        <p className="text-sm text-slate-400">Toca los ejercicios que quieres en tu rutina.</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en español o inglés…"
          className="mt-3 w-full rounded-xl border border-line bg-panel px-4 py-3 text-base outline-none focus:border-accent"
        />
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Chip active={!group && !onlySelected} onClick={() => { setGroup(null); setOnlySelected(false) }}>
            Todos
          </Chip>
          <Chip active={onlySelected} onClick={() => setOnlySelected((v) => !v)}>
            ✓ Elegidos {selection.length > 0 && `(${selection.length})`}
          </Chip>
          {GROUPS.map((g) => {
            const n = countByGroup(g)
            return (
              <Chip key={g} active={group === g} onClick={() => setGroup(group === g ? null : g)}>
                {g}
                {n > 0 && <span className="ml-1 text-accent">{n}</span>}
              </Chip>
            )
          })}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {list.map((e) => {
          const on = selected.has(e.id)
          return (
            <button
              key={e.id}
              onClick={() => toggleSelection(e.id)}
              className={`overflow-hidden rounded-2xl border-2 bg-panel text-left transition active:scale-[0.98] ${
                on ? 'border-accent' : 'border-transparent'
              }`}
            >
              <div className="relative">
                <ExerciseImage id={e.id} className="aspect-[4/3]" />
                {on && (
                  <span className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-accent font-bold text-ink">
                    ✓
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <div className="text-[15px] leading-tight font-semibold">{e.es}</div>
                <div className="mt-0.5 text-xs leading-tight text-slate-400">{e.en}</div>
                <div className="mt-1.5 text-[11px] text-slate-500">
                  {e.group} · {e.equipment}
                </div>
              </div>
            </button>
          )
        })}
        {list.length === 0 && <p className="col-span-2 py-10 text-center text-slate-400">Sin resultados.</p>}
      </div>

      {selection.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 px-4">
          <button
            onClick={() => navigate('/rutina')}
            className="mx-auto block w-full max-w-lg rounded-2xl bg-accent py-4 text-lg font-bold text-ink shadow-lg shadow-black/40"
          >
            Armar rutina con {selection.length} ejercicio{selection.length === 1 ? '' : 's'} →
          </button>
        </div>
      )}
      {selection.length > 0 && <div className="h-20" />}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap ${
        active ? 'border-accent bg-accent/15 text-accent' : 'border-line text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}
