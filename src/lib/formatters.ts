// ─── RestaurantOS — Formatting Helpers ─────────────────────────────────────
// Pure functions with no React/component dependencies.
// Extracted from src/app/page.tsx during Phase 1 refactor.

/**
 * Format a number as EUR currency (es-ES locale).
 */
export const formatEUR = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

/**
 * Format an ISO date string as a short time (HH:MM, es-ES locale).
 */
export const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Human-readable elapsed time since a date string.
 * Returns "Ahora", "X min", or "Xh Ym".
 */
export const timeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `${diff} min`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

/**
 * Return a Tailwind text-color class based on elapsed time.
 * < 5 min → green, < 10 min → amber, ≥ 10 min → red.
 */
export const elapsedColor = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 5) return 'text-green-400'
  if (diff < 10) return 'text-amber-400'
  return 'text-red-400'
}
