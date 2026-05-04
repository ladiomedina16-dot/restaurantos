// ============================================================
// /api/products — Product management (multi-restaurant)
// GET  /api/products   → List products (any authenticated user, scoped to restaurant)
// POST /api/products   → Create product (requires products:create, scoped to restaurant)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { createProductSchema, validateInput } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/products ──────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'products:read')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = { restaurantId }

    if (category) {
      where.category = category
    }

    if (active !== null) {
      where.active = active === 'true'
    }

    const products = await db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    return handleApiError('Products GET', error)
  }
}

// ─── POST /api/products ─────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'products:create')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const body = await request.json()

    const validation = validateInput(createProductSchema, body)
    if (!validation.success) return validation.error

    const { name, description, price, category, stock, imageUrl } = validation.data

    // Check product name uniqueness per restaurant
    const existing = await db.product.findUnique({
      where: { name_restaurantId: { name, restaurantId } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un producto con este nombre en este restaurante' },
        { status: 409 }
      )
    }

    const product = await db.product.create({
      data: {
        name,
        description,
        price,
        category,
        stock,
        imageUrl,
        restaurantId,
      },
    })

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'product_created',
      entityType: 'product',
      entityId: product.id,
      details: { name: product.name, price: product.price },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    return handleApiError('Products POST', error)
  }
}
