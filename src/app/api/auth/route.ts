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
        select: { id: true, username: true, name: true, role: true, active: true, zone: true, restaurantId: true, mustChangePassword: true },
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
        zone: user.zone ?? undefined,
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
          zone: user.zone ?? null,
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

    const { username, password, restaurantSlug } = validation.data

    // ─── Find user by username ──────────────────────────
    // Multi-restaurant: same username can exist in different restaurants.
    // Strategy:
    //   1. If restaurantSlug provided → resolve to restaurantId, find by username+restaurantId
    //   2. If not provided → find all users with that username
    //      - If 1 result → proceed (backward compatible)
    //      - If >1 results → return error asking for restaurantSlug
    //      - If 0 results → invalid credentials

    let user: {
      id: string
      username: string
      name: string
      role: string
      active: boolean
      passwordHash: string
      zone: string | null
      restaurantId: string | null
      mustChangePassword: boolean
    } | null = null

    if (restaurantSlug) {
      // Resolve slug to restaurant, then find user in that restaurant
      const restaurant = await db.restaurant.findUnique({
        where: { slug: restaurantSlug },
        select: { id: true },
      })
      if (!restaurant) {
        return NextResponse.json(
          { error: 'Restaurante no encontrado.' },
          { status: 401 }
        )
      }
      user = await db.user.findFirst({
        where: { username, restaurantId: restaurant.id },
      })
      // Also check super_admin (restaurantId=null) — they can login from any restaurant context
      if (!user) {
        user = await db.user.findFirst({
          where: { username, restaurantId: null },
        })
      }
    } else {
      // No slug provided — find all users with this username
      const candidates = await db.user.findMany({
        where: { username },
      })

      if (candidates.length === 0) {
        return NextResponse.json(
          { error: 'Credenciales inválidas' },
          { status: 401 }
        )
      }

      if (candidates.length === 1) {
        // Exactly one match — backward compatible
        user = candidates[0]
      } else {
        // Multiple matches — username exists in multiple restaurants
        // Try password against all candidates; if exactly one matches, use that
        const passwordMatches: typeof candidates = []
        for (const candidate of candidates) {
          const valid = await verifyPassword(password, candidate.passwordHash)
          if (valid) passwordMatches.push(candidate)
        }

        if (passwordMatches.length === 1) {
          // Only one candidate has this password — unambiguous
          user = passwordMatches[0]
        } else if (passwordMatches.length > 1) {
          // Multiple candidates with same password — need restaurantSlug to disambiguate
          const restaurants = await db.restaurant.findMany({
            where: { id: { in: passwordMatches.map(u => u.restaurantId).filter(Boolean) as string[] } },
            select: { slug: true, name: true },
          })
          return NextResponse.json(
            {
              error: 'Este usuario existe en múltiples restaurantes. Especifique el restaurante.',
              requiresRestaurant: true,
              restaurants: restaurants.map(r => ({ slug: r.slug, name: r.name })),
            },
            { status: 401 }
          )
        }
        // If no password matches, user stays null → falls through to "invalid credentials" below
      }
    }

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
      zone: (user as any).zone ?? undefined,
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
        zone: (user as any).zone ?? null,
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
        zone: true,
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

    return NextResponse.json({ user: { ...user, zone: user.zone ?? null } })
  } catch (error) {
    return handleApiError('Auth GET /me', error)
  }
}
