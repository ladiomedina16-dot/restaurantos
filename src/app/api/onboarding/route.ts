// ============================================================
// /api/onboarding — Restaurant onboarding (super_admin only)
// POST: { restaurantName, slug, address, phone, adminUsername, adminPassword, adminName }
// Creates restaurant + admin user in a single transaction
// Sets mustChangePassword: true on the created admin
// Audit log: onboarding_completed
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, hashPassword } from '@/lib/auth'
import { validateInput, onboardingSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

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
    const existingUser = await db.user.findUnique({ where: { username: adminUsername } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe.' },
        { status: 409 }
      )
    }

    // Hash the admin password
    const passwordHash = await hashPassword(adminPassword)

    // Create restaurant + admin user in a single transaction
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
    })

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
  } catch (error) {
    return handleApiError('Onboarding', error)
  }
}
