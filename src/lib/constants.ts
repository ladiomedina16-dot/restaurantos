// ─── RestaurantOS — Shared Constants ───────────────────────────────────────
// Pure data constants with no React/component dependencies.
// Extracted from src/app/page.tsx during Phase 1 refactor.
//
// NOTE: categoryConfig and zoneConfig contain JSX (React.ReactNode icons)
// and are NOT extracted here. They remain in page.tsx until a later phase
// where they can be moved to a .tsx file.

// ─── Order / Display ───────────────────────────────────────────────────────

export const zoneOrder = ['bar', 'main', 'terrace', 'private']

export const categoryOrder = ['bebida', 'tapa_fria', 'tapa_caliente', 'montadito', 'racion', 'postre', 'comida', 'general']

// ─── Role Labels & Colors ──────────────────────────────────────────────────

export const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  encargado: 'Encargado',
  camarero: 'Camarero',
  cocina: 'Cocina',
  barra: 'Barra',
  caja: 'Caja',
}

export const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-red-100 text-red-800 border-red-200',
  encargado: 'bg-blue-100 text-blue-800 border-blue-200',
  camarero: 'bg-green-100 text-green-800 border-green-200',
  cocina: 'bg-orange-100 text-orange-800 border-orange-200',
  barra: 'bg-amber-100 text-amber-800 border-amber-200',
  caja: 'bg-amber-100 text-amber-800 border-amber-200',
}

// ─── Order Status ──────────────────────────────────────────────────────────

export const orderStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  in_progress: { label: 'En preparación', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  ready: { label: 'Listo', color: 'bg-green-100 text-green-800 border-green-200' },
  served: { label: 'Servido', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid: { label: 'Pagado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200' },
}
