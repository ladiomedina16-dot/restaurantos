// ============================================================
// Auth utilities: JWT, bcrypt, role-based access
// v4: Multi-restaurant support, rate limiting
// ============================================================

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || ''

if (!JWT_SECRET) {
  console.warn('[AUTH] ⚠️ JWT_SECRET is not set. Authentication will not work. Set it in .env or Vercel environment variables.')
}
if (!JWT_REFRESH_SECRET) {
  console.warn('[AUTH] ⚠️ JWT_REFRESH_SECRET is not set. Token refresh will not work. Set it in .env or Vercel environment variables.')
}
const JWT_EXPIRES_IN = '8h'
const JWT_REFRESH_EXPIRES_IN = '7d'

// ─── Rate Limiting (in-memory) ─────────────────────────────

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
    return { allowed: true }
  }

  // Reset window if expired
  if (now - record.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
    return { allowed: true }
  }

  // Within window
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterMs = LOGIN_WINDOW_MS - (now - record.lastAttempt)
    return { allowed: false, retryAfterMs }
  }

  record.count++
  record.lastAttempt = now
  return { allowed: true }
}

export function clearRateLimit(ip: string) {
  loginAttempts.delete(ip)
}

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of loginAttempts.entries()) {
      if (now - record.lastAttempt > LOGIN_WINDOW_MS) {
        loginAttempts.delete(ip)
      }
    }
  }, 5 * 60 * 1000)
}

// ─── Types ──────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'encargado' | 'camarero' | 'cocina' | 'barra' | 'caja'

export interface JwtPayload {
  userId: string
  username: string
  role: UserRole
  zone?: string         // assigned zone for camareros: main, terrace, bar, private
  restaurantId?: string  // null for super_admin
}

// ─── Password utilities ─────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── JWT utilities ──────────────────────────────────────────

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload
  } catch {
    return null
  }
}

// ─── Role-based access control ──────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'], // all permissions
  admin: [
    'orders:read', 'orders:create', 'orders:update', 'orders:pay',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'tables:read', 'tables:create', 'tables:update', 'tables:delete',
    'clients:read', 'clients:create', 'clients:update', 'clients:delete',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'payments:read', 'dashboard:read',
    'cash:read', 'cash:open', 'cash:close',
    'print:read',
    'audit:read',
  ],
  encargado: [
    'orders:read', 'orders:create', 'orders:update', 'orders:pay',
    'products:read', 'products:update',
    'tables:read', 'tables:update',
    'clients:read', 'clients:create', 'clients:update',
    'users:read',
    'payments:read', 'dashboard:read',
    'cash:read', 'cash:open', 'cash:close',
    'print:read',
    'audit:read',
  ],
  camarero: [
    'orders:read', 'orders:create', 'orders:cancel',
    'products:read',
    'tables:read',
    'clients:read', 'clients:create',
  ],
  cocina: [
    'orders:read', 'orders:update', // can mark orders as ready
    'products:read',
  ],
  barra: [
    'orders:read', 'orders:update', // can mark bar items as ready
    'products:read',
  ],
  caja: [
    'orders:read', 'orders:pay',
    'products:read',
    'tables:read',
    'clients:read',
    'payments:read',
    'cash:read', 'cash:open', 'cash:close',
    'print:read',
  ],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

export function canAccessTab(role: UserRole, tab: string): boolean {
  switch (tab) {
    case 'camarero':
      return ['super_admin', 'admin', 'encargado', 'camarero'].includes(role)
    case 'barra':
      return ['super_admin', 'admin', 'encargado', 'barra'].includes(role)
    case 'cocina':
      return ['super_admin', 'admin', 'encargado', 'cocina'].includes(role)
    case 'caja':
      return ['super_admin', 'admin', 'encargado', 'caja'].includes(role)
    case 'reportes':
      return ['super_admin', 'admin', 'encargado'].includes(role)
    case 'dashboard':
    case 'products':
    case 'tables':
    case 'orders':
    case 'clients':
    case 'users':
      return ['super_admin', 'admin', 'encargado'].includes(role)
    default:
      return false
  }
}

/**
 * Get the zone filter for a camarero user.
 * - camarero with zone: only see their zone
 * - camarero without zone: see all zones
 * - non-camarero: see all zones (returns null)
 */
export function getZoneFilter(user: JwtPayload): string | null {
  if (user.role !== 'camarero') return null
  return user.zone || null // null means no filter (all zones)
}

// ─── API Auth Helper ────────────────────────────────────────

export interface AuthResult {
  success: true
  user: JwtPayload
}

export interface AuthError {
  success: false
  response: NextResponse
}

export type AuthCheck = AuthResult | AuthError

/**
 * Extract and verify JWT from Authorization header.
 * Returns the user payload (now includes restaurantId) or an error response.
 */
export function authenticateRequest(request: Request): AuthCheck {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'No autorizado. Token requerido.' },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Token inválido o expirado.' },
        { status: 401 }
      ),
    }
  }

  return { success: true, user: payload }
}

/**
 * Check if the authenticated user has the required permission.
 */
export function requirePermission(auth: AuthResult, permission: string): NextResponse | null {
  if (!hasPermission(auth.user.role as UserRole, permission)) {
    return NextResponse.json(
      { error: 'Permisos insuficientes.' },
      { status: 403 }
    )
  }
  return null
}

/**
 * Combined helper: authenticate + check permission in one call.
 */
export function authenticateAndAuthorize(
  request: Request,
  permission: string
): { user: JwtPayload } | { error: NextResponse } {
  const auth = authenticateRequest(request)
  if (!auth.success) {
    return { error: auth.response }
  }

  const permError = requirePermission(auth, permission)
  if (permError) {
    return { error: permError }
  }

  return { user: auth.user }
}

/**
 * Get the restaurant scope for the authenticated user.
 * - super_admin: must provide X-Restaurant-Id header, or returns all
 * - Others: returns their assigned restaurantId
 */
export function getRestaurantScope(request: Request, user: JwtPayload): { restaurantId?: string; isSuperAdmin: boolean } {
  if (user.role === 'super_admin') {
    const headerRestaurantId = request.headers.get('X-Restaurant-Id')
    return { restaurantId: headerRestaurantId || undefined, isSuperAdmin: true }
  }
  return { restaurantId: user.restaurantId, isSuperAdmin: false }
}

/**
 * Ensure the user can only access data within their restaurant.
 * Returns the restaurantId to filter by, or an error response.
 */
export function requireRestaurantScope(user: JwtPayload, request: Request): { restaurantId: string } | { error: NextResponse } {
  if (user.role === 'super_admin') {
    const headerRestaurantId = request.headers.get('X-Restaurant-Id')
    if (!headerRestaurantId) {
      return {
        error: NextResponse.json(
          { error: 'super_admin debe especificar X-Restaurant-Id header' },
          { status: 400 }
        ),
      }
    }
    return { restaurantId: headerRestaurantId }
  }

  if (!user.restaurantId) {
    return {
      error: NextResponse.json(
        { error: 'Usuario sin restaurante asignado' },
        { status: 403 }
      ),
    }
  }

  return { restaurantId: user.restaurantId }
}

/**
 * SaaS Subscription Guard: Check if the restaurant has an active subscription.
 * Returns { active: true } if the subscription is OK, or an error NextResponse if suspended.
 * super_admin bypasses this check.
 */
export async function requireActiveSubscription(
  restaurantId: string,
  userRole: string
): Promise<{ active: boolean } | { error: NextResponse }> {
  // super_admin always bypasses subscription checks
  if (userRole === 'super_admin') {
    return { active: true }
  }

  try {
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { subscriptionStatus: true },
    })

    if (!restaurant) {
      return {
        error: NextResponse.json(
          { error: 'Restaurante no encontrado.' },
          { status: 404 }
        ),
      }
    }

    if (restaurant.subscriptionStatus === 'suspended') {
      return {
        error: NextResponse.json(
          { error: 'Restaurante suspendido. Contacte al administrador.' },
          { status: 403 }
        ),
      }
    }

    return { active: true }
  } catch (error) {
    console.error('[AUTH] Error checking subscription:', error)
    return {
      error: NextResponse.json(
        { error: 'Error al verificar la suscripción.' },
        { status: 500 }
      ),
    }
  }
}
