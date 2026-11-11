// Pitido de fin de descanso. Los navegadores solo dejan sonar audio que se
// "desbloqueó" con un toque del usuario: por eso primeAudio() se llama al tocar
// el botón de descanso y beep() puede sonar después, al terminar la cuenta.
let ctx: AudioContext | null = null

export function primeAudio(): void {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
  } catch {
    // sin Web Audio: solo destello en pantalla
  }
}

export function beep(): void {
  if (ctx) {
    const t = ctx.currentTime
    for (const [i, freq] of [880, 880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t + i * 0.22)
      gain.gain.exponentialRampToValueAtTime(0.4, t + i * 0.22 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t + i * 0.22)
      osc.stop(t + i * 0.22 + 0.2)
    }
  }
  navigator.vibrate?.([200, 100, 200]) // Android; iPhone no permite vibrar desde la web
}
