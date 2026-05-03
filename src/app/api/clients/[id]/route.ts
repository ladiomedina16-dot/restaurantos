// ============================================================
// /api/clients/[id] — Single client operations (multi-restaurant)
// GET    /api/clients/[id]  → Get client (any authenticated user, scoped to restaurant)
// PUT    /api/clients/[id]  → Update client (requires clients:update, scoped to restaurant)
// DELETE /api/clients/[id]  → Delete client (requires clients:delete, scoped to restaurant)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { updateClientSchema, validateInput } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/clients/[id] ──────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'clients:read')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    const client = await db.client.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            table: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client || client.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    return handleApiError('Client GET', error)
  }
}

// ─── PUT /api/clients/[id] ──────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'clients:update')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params
    const body = await request.json()

    const validation = validateInput(updateClientSchema, body)
    if (!validation.success) return validation.error

    const existing = await db.client.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // If changing phone, check uniqueness per restaurant
    if (validation.data.phone !== undefined && validation.data.phone !== existing.phone) {
      const duplicate = await db.client.findUnique({
        where: { phone_restaurantId: { phone: validation.data.phone, restaurantId } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este teléfono en este restaurante' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validation.data.name !== undefined) updateData.name = validation.data.name
    if (validation.data.phone !== undefined) updateData.phone = validation.data.phone
    if (validation.data.email !== undefined) updateData.email = validation.data.email
    if (validation.data.notes !== undefined) updateData.notes = validation.data.notes
    if (validation.data.points !== undefined) updateData.points = validation.data.points
    if (validation.data.visits !== undefined) updateData.visits = validation.data.visits

    const client = await db.client.update({
      where: { id },
      data: updateData,
    })

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'client_updated',
      entityType: 'client',
      entityId: client.id,
      details: { updatedFields: Object.keys(updateData) },
    })

    return NextResponse.json({ client })
  } catch (error) {
    return handleApiError('Client PUT', error)
  }
}

// ─── DELETE /api/clients/[id] ───────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'clients:delete')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    const existing = await db.client.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    })

    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if client has active orders
    const activeOrders = await db.order.count({
      where: {
        clientId: id,
        status: { notIn: ['paid', 'cancelled'] },
      },
    })

    if (activeOrders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with active orders' },
        { status: 400 }
      )
    }

    // Delete the client (their completed orders will have clientId set to null)
    await db.client.delete({ where: { id } })

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'client_deleted',
      entityType: 'client',
      entityId: id,
      details: { name: existing.name, phone: existing.phone },
    })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    return handleApiError('Client DELETE', error)
  }
}
