// ============================================================
// /api/users — User management CRUD
// GET  /api/users       → List users (requires users:read)
// POST /api/users       → Create user (requires users:create)
// PUT  /api/users       → Update user active status (deactivation)
// v4: Multi-restaurant scoping, Zod validation, audit logging
// v5: mustChangePassword on creation, active toggle, deactivation audit
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  authenticateAndAuthorize,
  requireRestaurantScope,
  hashPassword,
  type JwtPayload,
} from '@/lib/auth'
import { validateInput, createUserSchema, updateUserStatusSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

// ─── GET /api/users ─────────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'users:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}

    // ─── Restaurant scoping ────────────────────────────────
    if (user.role === 'super_admin') {
      // super_admin can optionally filter by X-Restaurant-Id header
      const headerRestaurantId = request.headers.get('X-Restaurant-Id')
      if (headerRestaurantId) {
        where.restaurantId = headerRestaurantId
      }
      // If no header, super_admin sees all users across restaurants
    } else {
      // Non-super_admin: only see users from same restaurant
      if (user.restaurantId) {
        where.restaurantId = user.restaurantId
      } else {
        // User without restaurant should see nothing
        return NextResponse.json({ users: [] })
      }
    }

    if (role) {
      where.role = role
    }

    if (active !== null) {
      where.active = active === 'true'
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        mustChangePassword: true,
        zone: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    return handleApiError('Users GET', error)
  }
}

// ─── POST /api/users ────────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'users:create')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const body = await request.json()

    // ─── Zod validation ──────────────────────────────────
    const validation = validateInput(createUserSchema, body)
    if (!validation.success) return validation.error

    const { username, password, name, role: userRole, active, zone, restaurantId: bodyRestaurantId } = validation.data

    // ─── Role elevation check ────────────────────────────
    // Only super_admin can create super_admin or admin users
    if (
      (userRole === 'super_admin' || userRole === 'admin') &&
      user.role !== 'super_admin'
    ) {
      return NextResponse.json(
        { error: 'Permisos insuficientes para crear este rol.' },
        { status: 403 }
      )
    }

    // ─── Check username uniqueness ───────────────────────
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe' },
        { status: 409 }
      )
    }

    // ─── Determine restaurantId for new user ─────────────
    // super_admin can specify restaurantId explicitly
    // Non-super_admin users inherit the creator's restaurantId
    let targetRestaurantId: string | null
    if (user.role === 'super_admin') {
      // super_admin must specify restaurantId (required for audit scoping)
      targetRestaurantId = bodyRestaurantId ?? null
    } else {
      // Non-super_admin: user is assigned to their restaurant
      targetRestaurantId = user.restaurantId ?? null
    }

    const passwordHash = await hashPassword(password)

    // ─── mustChangePassword: true by default unless explicitly set to false ─
    const mustChangePassword = body.mustChangePassword !== false

    const newUser = await db.user.create({
      data: {
        username,
        passwordHash,
        name,
        role: userRole,
        active,
        mustChangePassword,
        zone: zone ?? null,
        restaurantId: targetRestaurantId,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        mustChangePassword: true,
        zone: true,
        restaurantId: true,
        createdAt: true,
      },
    })

    // ─── Audit logging ──────────────────────────────────
    await createAuditLog({
      restaurantId: targetRestaurantId ?? 'unknown',
      userId: user.userId,
      action: 'user_created',
      entityType: 'user',
      entityId: newUser.id,
      details: { username, role: userRole, active, mustChangePassword, zone, restaurantId: targetRestaurantId },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    return handleApiError('Users POST', error)
  }
}

// ─── PUT /api/users ─────────────────────────────────────────
// Update user active status (deactivation)

export async function PUT(request: Request) {
  const auth = authenticateAndAuthorize(request, 'users:update')
  if ('error' in auth) return auth.error
  const { user: adminUser } = auth

  try {
    const body = await request.json()
    const targetUserId = body.id as string | undefined

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido.' },
        { status: 400 }
      )
    }

    const validation = validateInput(updateUserStatusSchema, body)
    if (!validation.success) return validation.error

    const { active } = validation.data

    // Fetch target user
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, role: true, active: true, zone: true, restaurantId: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      )
    }

    // Non-super_admin can only update users in their own restaurant
    if (adminUser.role !== 'super_admin' && targetUser.restaurantId !== adminUser.restaurantId) {
      return NextResponse.json(
        { error: 'No puede modificar un usuario de otro restaurante.' },
        { status: 403 }
      )
    }

    // Cannot deactivate yourself
    if (targetUser.id === adminUser.userId) {
      return NextResponse.json(
        { error: 'No puede desactivar su propio usuario.' },
        { status: 400 }
      )
    }

    // Non-super_admin cannot deactivate super_admin
    if (targetUser.role === 'super_admin' && adminUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'No puede desactivar un super_admin.' },
        { status: 403 }
      )
    }

    // Only admin/super_admin can deactivate admin
    if (targetUser.role === 'admin' && !['super_admin', 'admin'].includes(adminUser.role)) {
      return NextResponse.json(
        { error: 'Permisos insuficientes para desactivar este usuario.' },
        { status: 403 }
      )
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: { active },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        mustChangePassword: true,
        zone: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Audit log for deactivation
    if (!active && targetUser.active) {
      await createAuditLog({
        restaurantId: targetUser.restaurantId ?? adminUser.restaurantId ?? 'unknown',
        userId: adminUser.userId,
        action: 'user_deactivated',
        entityType: 'user',
        entityId: targetUserId,
        details: {
          targetUsername: targetUser.username,
          targetRole: targetUser.role,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      })
    } else {
      await createAuditLog({
        restaurantId: targetUser.restaurantId ?? adminUser.restaurantId ?? 'unknown',
        userId: adminUser.userId,
        action: 'user_updated',
        entityType: 'user',
        entityId: targetUserId,
        details: {
          targetUsername: targetUser.username,
          active,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      })
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    return handleApiError('Users PUT', error)
  }
}
