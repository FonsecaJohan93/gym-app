import { imageUrl } from '../lib/exercises'

/** Foto del ejercicio. Con `animate`, alterna posición inicial y final para mostrar el movimiento. */
export function ExerciseImage({ id, animate = false, className = '' }: { id: string; animate?: boolean; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      <img src={imageUrl(id, 0)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {animate && (
        <img src={imageUrl(id, 1)} alt="" className="absolute inset-0 h-full w-full object-cover animate-[frame_2.4s_steps(1)_infinite]" />
      )}
    </div>
  )
}
