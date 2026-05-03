// ============================================================
// /api/tables — Table management (multi-restaurant)
// GET  /api/tables   → List tables (any authenticated user, scoped to restaurant)
// POST /api/tables   → Create table (requires tables:create, scoped to restaurant)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { createTableSchema, validateInput } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/tables ────────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'tables:read')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const zone = searchParams.get('zone')

    const where: Record<string, unknown> = { active: true, restaurantId }

    if (status) {
      where.status = status
    }

    if (zone) {
      where.zone = zone
    }

    const tables = await db.table.findMany({
      where,
      orderBy: { number: 'asc' },
    })

    return NextResponse.json({ tables })
  } catch (error) {
    return handleApiError('Tables GET', error)
  }
}

// ─── POST /api/tables ───────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'tables:create')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const body = await request.json()

    const validation = validateInput(createTableSchema, body)
    if (!validation.success) return validation.error

    const { number, capacity, zone, notes } = validation.data

    // Check table number uniqueness per restaurant
    const existing = await db.table.findUnique({
      where: { number_restaurantId: { number, restaurantId } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una mesa con este número en este restaurante' },
        { status: 409 }
      )
    }

    const table = await db.table.create({
      data: {
        number,
        capacity,
        zone,
        notes,
        restaurantId,
      },
    })

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'table_created',
      entityType: 'table',
      entityId: table.id,
      details: { number: table.number, capacity: table.capacity, zone: table.zone },
    })

    return NextResponse.json({ table }, { status: 201 })
  } catch (error) {
    return handleApiError('Tables POST', error)
  }
}
