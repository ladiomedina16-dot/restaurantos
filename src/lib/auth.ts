// ============================================================
// Auth utilities: JWT, bcrypt, role-based access
// ============================================================

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'rst-os-dev-jwt-fallback'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'rst-os-dev-refresh-fallback'
const JWT_EXPIRES_IN = '8h'
const JWT_REFRESH_EXPIRES_IN = '7d'

// ─── Types ──────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'encargado' | 'camarero' | 'cocina' | 'caja'

export interface JwtPayload {
  userId: string
  username: string
  role: UserRole
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
  ],
  encargado: [
    'orders:read', 'orders:create', 'orders:update', 'orders:pay',
    'products:read', 'products:update',
    'tables:read', 'tables:update',
    'clients:read', 'clients:create', 'clients:update',
    'users:read',
    'payments:read', 'dashboard:read',
  ],
  camarero: [
    'orders:read', 'orders:create',
    'products:read',
    'tables:read',
    'clients:read', 'clients:create',
  ],
  cocina: [
    'orders:read', 'orders:update', // can mark orders as ready
    'products:read',
  ],
  caja: [
    'orders:read', 'orders:pay',
    'products:read',
    'tables:read',
    'clients:read',
    'payments:read',
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
    case 'cocina':
      return ['super_admin', 'admin', 'encargado', 'cocina'].includes(role)
    case 'caja':
      return ['super_admin', 'admin', 'encargado', 'caja'].includes(role)
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

// ─── API Auth Helper ────────────────────────────────────────

import { NextResponse } from 'next/server'

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
 * Returns the user payload or an error response.
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
 * Call after authenticateRequest().
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
