// ============================================================
// /api/restaurants — Restaurant management
// GET  /api/restaurants → List restaurants (super_admin sees all with stats, others see own)
// POST /api/restaurants → Create restaurant (super_admin only)
// PUT  /api/restaurants → Update restaurant (super_admin can change subscriptionStatus)
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, getRestaurantScope } from '@/lib/auth'
import { validateInput, createRestaurantSchema, updateRestaurantFullSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

// ─── GET /api/restaurants ──────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'orders:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = getRestaurantScope(request, user)

    const where: Record<string, unknown> = {}
    if (scope.restaurantId) {
      where.id = scope.restaurantId
    }
    // super_admin without X-Restaurant-Id header sees all restaurants

    const restaurants = await db.restaurant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            tables: { where: { active: true } },
            products: { where: { active: true } },
            orders: true,
          },
        },
        users: {
          where: { role: 'admin' },
          select: { id: true, username: true, name: true, active: true },
        },
      },
    })

    return Response.json({ restaurants })
  } catch (error) {
    return handleApiError('Restaurants GET', error)
  }
}

// ─── POST /api/restaurants ─────────────────────────────────

export async function POST(request: Request) {
  // Only super_admin can create restaurants
  const auth = authenticateAndAuthorize(request, '*')
  if ('error' in auth) return auth.error
  const { user } = auth

  // Double-check super_admin role
  if (user.role !== 'super_admin') {
    return Response.json(
      { error: 'Solo super_admin puede crear restaurantes.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const validation = validateInput(createRestaurantSchema, body)
    if (!validation.success) return validation.error

    const { name, slug, address, phone } = validation.data

    // Check if slug already exists
    const existing = await db.restaurant.findUnique({ where: { slug } })
    if (existing) {
      return Response.json(
        { error: 'Ya existe un restaurante con este slug.' },
        { status: 409 }
      )
    }

    const restaurant = await db.restaurant.create({
      data: {
        name,
        slug,
        address,
        phone,
      },
    })

    return Response.json({ restaurant }, { status: 201 })
  } catch (error) {
    return handleApiError('Restaurants POST', error)
  }
}

// ─── PUT /api/restaurants ──────────────────────────────────

export async function PUT(request: Request) {
  const auth = authenticateAndAuthorize(request, '*')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const body = await request.json()
    const validation = validateInput(updateRestaurantFullSchema, body)
    if (!validation.success) return validation.error

    // Determine target restaurant
    let targetRestaurantId: string
    if (user.role === 'super_admin') {
      const bodyId = (body as Record<string, unknown>).id as string | undefined
      const headerId = request.headers.get('X-Restaurant-Id')
      targetRestaurantId = bodyId || headerId || ''
      if (!targetRestaurantId) {
        return Response.json(
          { error: 'Se requiere ID del restaurante para actualizar.' },
          { status: 400 }
        )
      }
    } else {
      if (!user.restaurantId) {
        return Response.json(
          { error: 'Usuario sin restaurante asignado.' },
          { status: 403 }
        )
      }
      targetRestaurantId = user.restaurantId
    }

    // Check restaurant exists
    const existing = await db.restaurant.findUnique({
      where: { id: targetRestaurantId },
    })
    if (!existing) {
      return Response.json(
        { error: 'Restaurante no encontrado.' },
        { status: 404 }
      )
    }

    const { name, address, phone, active, subscriptionStatus } = validation.data

    // Non-super_admin cannot change subscriptionStatus
    if (subscriptionStatus !== undefined && user.role !== 'super_admin') {
      return Response.json(
        { error: 'Solo super_admin puede cambiar el estado de suscripción.' },
        { status: 403 }
      )
    }

    // Non-super_admin cannot deactivate restaurant
    if (active === false && user.role !== 'super_admin') {
      return Response.json(
        { error: 'Solo super_admin puede desactivar un restaurante.' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (active !== undefined) updateData.active = active
    if (subscriptionStatus !== undefined && user.role === 'super_admin') {
      updateData.subscriptionStatus = subscriptionStatus
    }

    const restaurant = await db.restaurant.update({
      where: { id: targetRestaurantId },
      data: updateData,
    })

    // Audit log for subscription changes
    if (subscriptionStatus !== undefined && subscriptionStatus !== existing.subscriptionStatus) {
      await createAuditLog({
        restaurantId: targetRestaurantId,
        userId: user.userId,
        action: 'subscription_changed',
        entityType: 'restaurant',
        entityId: targetRestaurantId,
        details: {
          from: existing.subscriptionStatus,
          to: subscriptionStatus,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      })
    }

    return Response.json({ restaurant })
  } catch (error) {
    return handleApiError('Restaurants PUT', error)
  }
}
