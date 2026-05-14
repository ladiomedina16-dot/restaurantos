// ============================================================
// /api/settings — Restaurant fiscal/ticket settings
// GET  /api/settings → Get settings for the user's restaurant
// PUT  /api/settings → Upsert settings for the user's restaurant
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, updateSettingsSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'

// Default settings returned when no record exists yet
function defaultSettings(restaurantId: string) {
  return {
    id: '',
    restaurantId,
    fiscalName: '',
    taxId: '',
    fiscalAddress: '',
    phone: '',
    email: '',
    ticketLegalText: '',
    defaultVatRate: 21,
    logoUrl: '',
    defaultDocumentType: 'ticket' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── GET /api/settings ────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'dashboard:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const settings = await db.restaurantSettings.findUnique({
      where: { restaurantId },
    })

    if (!settings) {
      // No settings yet — return defaults
      return NextResponse.json({ settings: defaultSettings(restaurantId) })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    return handleApiError('Settings GET', error)
  }
}

// ─── PUT /api/settings ────────────────────────────────────

export async function PUT(request: Request) {
  const auth = authenticateAndAuthorize(request, 'dashboard:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  // Only admin, encargado and super_admin can edit settings
  if (!['super_admin', 'admin', 'encargado'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Solo admin, encargado o super_admin pueden editar la configuración fiscal.' },
      { status: 403 }
    )
  }

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const body = await request.json()

    const validation = validateInput(updateSettingsSchema, body)
    if (!validation.success) return validation.error

    const data = validation.data

    // Upsert: create if not exists, update if exists
    const settings = await db.restaurantSettings.upsert({
      where: { restaurantId },
      update: data,
      create: {
        restaurantId,
        ...data,
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    return handleApiError('Settings PUT', error)
  }
}
