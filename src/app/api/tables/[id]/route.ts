// ============================================================
// /api/tables/[id] — Single table operations (multi-restaurant)
// GET    /api/tables/[id]  → Get table (any authenticated user, scoped to restaurant)
// PUT    /api/tables/[id]  → Update table (requires tables:update, scoped to restaurant)
// DELETE /api/tables/[id]  → Delete table (requires tables:delete, scoped to restaurant)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { updateTableSchema, validateInput } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'
import { emitTableStatusChanged } from '@/lib/realtime'

// ─── GET /api/tables/[id] ───────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'tables:read')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    const table = await db.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { notIn: ['paid', 'cancelled'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!table || table.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ table })
  } catch (error) {
    return handleApiError('Table GET', error)
  }
}

// ─── PUT /api/tables/[id] ───────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'tables:update')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params
    const body = await request.json()

    const validation = validateInput(updateTableSchema, body)
    if (!validation.success) return validation.error

    const existing = await db.table.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // If changing table number, check uniqueness per restaurant
    if (validation.data.number !== undefined && validation.data.number !== existing.number) {
      const duplicate = await db.table.findUnique({
        where: { number_restaurantId: { number: validation.data.number, restaurantId } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe una mesa con este número en este restaurante' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validation.data.number !== undefined) updateData.number = validation.data.number
    if (validation.data.capacity !== undefined) updateData.capacity = validation.data.capacity
    if (validation.data.zone !== undefined) updateData.zone = validation.data.zone
    if (validation.data.status !== undefined) updateData.status = validation.data.status
    if (validation.data.notes !== undefined) updateData.notes = validation.data.notes
    if (validation.data.active !== undefined) updateData.active = validation.data.active

    const table = await db.table.update({
      where: { id },
      data: updateData,
    })

    // Emit real-time event if status changed
    if (validation.data.status !== undefined && validation.data.status !== existing.status) {
      await emitTableStatusChanged(table)
    }

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'table_updated',
      entityType: 'table',
      entityId: table.id,
      details: { updatedFields: Object.keys(updateData), previousStatus: existing.status },
    })

    return NextResponse.json({ table })
  } catch (error) {
    return handleApiError('Table PUT', error)
  }
}

// ─── DELETE /api/tables/[id] ────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'tables:delete')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    const existing = await db.table.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Soft delete: set active=false
    const table = await db.table.update({
      where: { id },
      data: { active: false },
    })

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'table_deleted',
      entityType: 'table',
      entityId: table.id,
      details: { number: table.number, softDelete: true },
    })

    return NextResponse.json({ table })
  } catch (error) {
    return handleApiError('Table DELETE', error)
  }
}
