// ============================================================
// /api/clients — Client management (multi-restaurant)
// GET  /api/clients   → List clients (any authenticated user, scoped to restaurant)
// POST /api/clients   → Create client (requires clients:create, scoped to restaurant)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { createClientSchema, validateInput } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/clients ───────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'clients:read')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { restaurantId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' }, restaurantId },
        { phone: { contains: search, mode: 'insensitive' }, restaurantId },
      ]
    }

    const clients = await db.client.findMany({
      where,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    return handleApiError('Clients GET', error)
  }
}

// ─── POST /api/clients ──────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'clients:create')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const body = await request.json()

    const validation = validateInput(createClientSchema, body)
    if (!validation.success) return validation.error

    const { name, phone, email, notes } = validation.data

    // Check phone uniqueness per restaurant
    const existing = await db.client.findUnique({
      where: { phone_restaurantId: { phone, restaurantId } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con este teléfono en este restaurante' },
        { status: 409 }
      )
    }

    const client = await db.client.create({
      data: {
        name,
        phone,
        email,
        notes,
        restaurantId,
      },
    })

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'client_created',
      entityType: 'client',
      entityId: client.id,
      details: { name: client.name, phone: client.phone },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    return handleApiError('Clients POST', error)
  }
}
