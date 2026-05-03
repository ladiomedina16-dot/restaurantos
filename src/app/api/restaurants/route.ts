// ============================================================
// /api/restaurants — Restaurant management
// GET  /api/restaurants → List restaurants (super_admin sees all, others see own)
// POST /api/restaurants → Create restaurant (super_admin only)
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, getRestaurantScope } from '@/lib/auth'
import { validateInput, createRestaurantSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'

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
