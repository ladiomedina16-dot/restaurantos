// ============================================================
// /api/onboarding — Restaurant onboarding (super_admin only)
// POST: { restaurantName, slug, address, phone, adminUsername, adminPassword, adminName }
// Creates restaurant + admin user in a short transaction
// Then copies BASE_PRODUCTS using createMany (outside transaction)
// Sets mustChangePassword: true on the created admin
// Audit log: onboarding_completed
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, hashPassword } from '@/lib/auth'
import { validateInput, onboardingSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'
import { BASE_PRODUCTS } from '@/lib/base-products'

export async function POST(request: Request) {
  // Only super_admin can onboard new restaurants
  const auth = authenticateAndAuthorize(request, '*')
  if ('error' in auth) return auth.error
  const { user } = auth

  if (user.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Solo super_admin puede realizar el onboarding.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    // Zod validation
    const validation = validateInput(onboardingSchema, body)
    if (!validation.success) return validation.error

    const { restaurantName, slug, address, phone, adminUsername, adminPassword, adminName } = validation.data

    // Check if slug already exists
    const existingRestaurant = await db.restaurant.findUnique({ where: { slug } })
    if (existingRestaurant) {
      return NextResponse.json(
        { error: 'Ya existe un restaurante con este slug.' },
        { status: 409 }
      )
    }

    // Check if admin username already exists
  const existingSuperAdmin = await db.user.findFirst({
  where: {
    username: adminUsername,
    restaurantId: null,
  },
})

if (existingSuperAdmin) {
  return Response.json(
    { error: 'El nombre de usuario ya existe como super_admin.' },
    { status: 400 }
  )
}

    // Hash the admin password
    const passwordHash = await hashPassword(adminPassword)

    // Step 1: Create restaurant + admin user in a SHORT transaction with timeout
    const result = await db.$transaction(async (tx) => {
      // Create the restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug,
          address,
          phone,
          subscriptionStatus: 'trial',
        },
      })

      // Create the admin user for this restaurant
      const adminUser = await tx.user.create({
        data: {
          username: adminUsername,
          passwordHash,
          name: adminName,
          role: 'admin',
          active: true,
          mustChangePassword: true,
          restaurantId: restaurant.id,
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          active: true,
          mustChangePassword: true,
          restaurantId: true,
          createdAt: true,
        },
      })

      return { restaurant, user: adminUser }
    }, { timeout: 15000, maxWait: 10000 })

    // Step 2: Copy BASE_PRODUCTS using createMany (OUTSIDE the transaction for speed)
    try {
      await db.product.createMany({
        data: BASE_PRODUCTS.map(p => ({
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          stock: p.stock,
          restaurantId: result.restaurant.id,
        })),
      })
    } catch (productError) {
      // If products fail to copy, log but don't fail the entire onboarding
      // The restaurant and admin were already created successfully
      console.error('[ONBOARDING] Error copying BASE_PRODUCTS:', productError)
    }

    // Audit log
    await createAuditLog({
      restaurantId: result.restaurant.id,
      userId: user.userId,
      action: 'onboarding_completed',
      entityType: 'restaurant',
      entityId: result.restaurant.id,
      details: {
        restaurantName,
        slug,
        adminUsername,
        adminName,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    })

    return NextResponse.json({
      restaurant: result.restaurant,
      user: result.user,
    }, { status: 201 })
  } catch (error: any) {
    // Handle P2028 specifically (transaction timeout)
    if (error?.code === 'P2028') {
      return NextResponse.json(
        { error: 'Tiempo de transacción agotado al crear restaurante. Intente de nuevo.' },
        { status: 504 }
      )
    }
    return handleApiError('Onboarding', error)
  }
}
