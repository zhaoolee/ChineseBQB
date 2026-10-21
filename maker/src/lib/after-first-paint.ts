/**
 * Run a content request only after the browser has had a chance to paint.
 *
 * A single requestAnimationFrame callback still runs before the frame it belongs to
 * is painted, so scheduling the work from inside a second rAF is the smallest
 * reliable "one paint has happened" signal. The returned cleanup is safe to call
 * from React StrictMode's effect replay and from a real unmount.
 */
export function afterFirstPaint(task: () => void): () => void {
  let cancelled = false
  let first: number | undefined
  let second: number | undefined
  let fallback: ReturnType<typeof setTimeout> | undefined

  const run = () => {
    if (cancelled) return
    cancelled = true
    task()
  }

  if (typeof requestAnimationFrame === 'function') {
    first = requestAnimationFrame(() => {
      if (cancelled) return
      second = requestAnimationFrame(run)
    })
  } else {
    // Very old browsers and non-browser tests have no frame clock. A timer is
    // the best available approximation; real browsers always take the rAF path.
    fallback = setTimeout(run, 0)
  }

  return () => {
    cancelled = true
    if (first !== undefined && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(first)
    if (second !== undefined && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(second)
    if (fallback !== undefined) clearTimeout(fallback)
  }
}
