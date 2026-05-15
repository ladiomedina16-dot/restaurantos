// ─── RestaurantOS — Client-side Permission Check ───────────────────────────
// Mirrors the server-side ROLE_PERMISSIONS from src/lib/auth.ts
// but is safe to use in client components without importing server code.
// Extracted from src/app/page.tsx during Phase 1 refactor.

const CLIENT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['orders:read', 'orders:create', 'orders:update', 'orders:cancel', 'orders:pay', 'products:read', 'products:create', 'products:update', 'products:delete', 'tables:read', 'tables:create', 'tables:update', 'tables:delete', 'clients:read', 'clients:create', 'clients:update', 'clients:delete', 'users:read', 'users:create', 'users:update', 'users:delete', 'payments:read', 'dashboard:read', 'cash:read', 'cash:open', 'cash:close', 'print:read', 'audit:read'],
  encargado: ['orders:read', 'orders:create', 'orders:update', 'orders:cancel', 'orders:pay', 'products:read', 'products:update', 'tables:read', 'tables:update', 'clients:read', 'clients:create', 'clients:update', 'users:read', 'payments:read', 'dashboard:read', 'cash:read', 'cash:open', 'cash:close', 'print:read', 'audit:read'],
  camarero: ['orders:read', 'orders:create', 'orders:update', 'orders:cancel', 'products:read', 'tables:read', 'clients:read', 'clients:create', 'print:read'],
  cocina: ['orders:read', 'orders:update', 'products:read', 'print:read'],
  barra: ['orders:read', 'orders:update', 'products:read', 'print:read'],
  caja: ['orders:read', 'orders:update', 'orders:cancel', 'orders:pay', 'products:read', 'tables:read', 'clients:read', 'payments:read', 'cash:read', 'cash:open', 'cash:close', 'print:read'],
}

/**
 * Check if a given role has a specific permission on the client side.
 * - super_admin with '*' always returns true.
 * - Unknown roles return false.
 */
export function clientHasPermission(role: string, permission: string): boolean {
  const perms = CLIENT_ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}
