// ============================================================
// /api/restaurants/[id] — Single restaurant operations
// GET  /api/restaurants/[id] → Get single restaurant
// PUT  /api/restaurants/[id] → Update restaurant
//   - super_admin can change subscriptionStatus
//   - admin can change name/address/phone
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize } from '@/lib/auth'
import { validateInput, updateRestaurantFullSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

// ─── GET /api/restaurants/[id] ────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'orders:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const { id } = await params

    const restaurant = await db.restaurant.findUnique({
      where: { id },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado.' },
        { status: 404 }
      )
    }

    // Non-super_admin can only see their own restaurant
    if (user.role !== 'super_admin' && user.restaurantId !== id) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ restaurant })
  } catch (error) {
    return handleApiError('Restaurant GET', error)
  }
}

// ─── PUT /api/restaurants/[id] ────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, '*')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const { id } = await params
    const body = await request.json()

    const validation = validateInput(updateRestaurantFullSchema, body)
    if (!validation.success) return validation.error

    // Check restaurant exists
    const existing = await db.restaurant.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado.' },
        { status: 404 }
      )
    }

    // Non-super_admin can only update their own restaurant
    if (user.role !== 'super_admin' && user.restaurantId !== id) {
      return NextResponse.json(
        { error: 'No tiene permisos para modificar este restaurante.' },
        { status: 403 }
      )
    }

    // Non-admin roles cannot update restaurant
    if (!['super_admin', 'admin', 'encargado'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permisos insuficientes.' },
        { status: 403 }
      )
    }

    const { name, address, phone, active, subscriptionStatus } = validation.data

    // Non-super_admin cannot change subscriptionStatus
    if (subscriptionStatus !== undefined && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Solo super_admin puede cambiar el estado de suscripción.' },
        { status: 403 }
      )
    }

    // Non-super_admin cannot deactivate restaurant
    if (active === false && user.role !== 'super_admin') {
      return NextResponse.json(
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
      where: { id },
      data: updateData,
    })

    // Audit log for subscription changes
    if (subscriptionStatus !== undefined && subscriptionStatus !== existing.subscriptionStatus) {
      await createAuditLog({
        restaurantId: id,
        userId: user.userId,
        action: 'subscription_changed',
        entityType: 'restaurant',
        entityId: id,
        details: {
          from: existing.subscriptionStatus,
          to: subscriptionStatus,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      })
    }

    return NextResponse.json({ restaurant })
  } catch (error) {
    return handleApiError('Restaurant PUT', error)
  }
}
