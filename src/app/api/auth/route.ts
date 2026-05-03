// ============================================================
// /api/auth — JWT Authentication endpoints
// POST /api/auth          → { username, password } → JWT token + refresh + user info
// POST /api/auth/refresh  → { refreshToken } → new JWT token
// GET  /api/auth/me       → Authorization: Bearer xxx → current user
// v4: Rate limiting, Zod validation, audit logging, multi-restaurant
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  hashPassword,
  verifyPassword,
  signToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken,
  checkRateLimit,
  clearRateLimit,
  type JwtPayload,
} from '@/lib/auth'
import { validateInput, loginSchema, refreshTokenSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

// ─── Helper: get client IP ──────────────────────────────────

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
}

// ─── POST /api/auth (login / refresh) ──────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const clientIp = getClientIp(request)

    // ─── Refresh token flow ──────────────────────────────────
    if (body.refreshToken) {
      const validation = validateInput(refreshTokenSchema, { refreshToken: body.refreshToken })
      if (!validation.success) return validation.error

      const payload = verifyRefreshToken(validation.data.refreshToken)
      if (!payload) {
        return NextResponse.json(
          { error: 'Refresh token inválido o expirado.' },
          { status: 401 }
        )
      }

      // Verify user still exists and is active
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, name: true, role: true, active: true, restaurantId: true, mustChangePassword: true },
      })

      if (!user || !user.active) {
        return NextResponse.json(
          { error: 'Usuario no encontrado o desactivado.' },
          { status: 401 }
        )
      }

      const newPayload: JwtPayload = {
        userId: user.id,
        username: user.username,
        role: user.role as JwtPayload['role'],
        restaurantId: user.restaurantId ?? undefined,
      }

      const token = signToken(newPayload)
      const newRefreshToken = signRefreshToken(newPayload)

      return NextResponse.json({
        token,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId,
          mustChangePassword: user.mustChangePassword,
        },
      })
    }

    // ─── Login flow ──────────────────────────────────────────

    // Rate limiting check
    const rateLimitResult = checkRateLimit(clientIp)
    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimitResult.retryAfterMs ?? 60000) / 1000)
      return NextResponse.json(
        {
          error: 'Demasiados intentos de login. Inténtalo más tarde.',
          retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    // Validate input with Zod
    const validation = validateInput(loginSchema, { username: body.username, password: body.password })
    if (!validation.success) return validation.error

    const { username, password } = validation.data

    const user = await db.user.findUnique({ where: { username } })

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Usuario desactivado' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Clear rate limit on successful login
    clearRateLimit(clientIp)

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role as JwtPayload['role'],
      restaurantId: user.restaurantId ?? undefined,
    }

    const token = signToken(payload)
    const refreshToken = signRefreshToken(payload)

    // Audit log for successful login (only if user has a restaurant)
    if (user.restaurantId) {
      await createAuditLog({
        restaurantId: user.restaurantId,
        userId: user.id,
        action: 'login_success',
        entityType: 'auth',
        ipAddress: clientIp,
      })
    }

    return NextResponse.json({
      token,
      refreshToken,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
        mustChangePassword: user.mustChangePassword,
      },
    })
  } catch (error) {
    return handleApiError('Auth POST', error)
  }
}

// ─── GET /api/auth/me ───────────────────────────────────────

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado. Token requerido.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido o expirado.' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        restaurantId: true,
        mustChangePassword: true,
        createdAt: true,
      },
    })

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o desactivado.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    return handleApiError('Auth GET /me', error)
  }
}
