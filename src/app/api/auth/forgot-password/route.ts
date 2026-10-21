// ============================================================
// /api/auth/forgot-password — Recuperación de contraseña
// Permite a administradores y trabajadores de un restaurante
// restablecer su contraseña especificando el slug del restaurante,
// su usuario y la nueva contraseña.
// ⚠️ Protege explícitamente al super_admin (nunca modificable por aquí).
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { validateInput, forgotPasswordSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar esquema Zod
    const validation = validateInput(forgotPasswordSchema, body)
    if (!validation.success) return validation.error

    const { restaurantSlug, username, newPassword } = validation.data
    const normalizedSlug = restaurantSlug.trim().toLowerCase()
    const normalizedUsername = username.trim()

    // 1. Buscar el restaurante por su slug
    const restaurant = await db.restaurant.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        name: true,
        active: true,
        subscriptionStatus: true,
      },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado. Revisa el slug o identificador del restaurante.' },
        { status: 404 }
      )
    }

    if (!restaurant.active || restaurant.subscriptionStatus === 'suspended') {
      return NextResponse.json(
        { error: 'El restaurante se encuentra suspendido o inactivo. Contacte al soporte técnico.' },
        { status: 403 }
      )
    }

    // 2. Buscar al usuario dentro de ese restaurante
    const targetUser = await db.user.findFirst({
      where: {
        username: normalizedUsername,
        restaurantId: restaurant.id,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        restaurantId: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: `No se encontró el usuario "${normalizedUsername}" en el restaurante ${restaurant.name}.` },
        { status: 404 }
      )
    }

    // 3. SEGURIDAD: Nunca permitir alterar la cuenta del super_admin
    if (targetUser.role === 'super_admin' || !targetUser.restaurantId) {
      return NextResponse.json(
        { error: 'Acción no permitida para cuentas de superadministrador.' },
        { status: 403 }
      )
    }

    if (!targetUser.active) {
      return NextResponse.json(
        { error: 'Este usuario se encuentra desactivado. Contacta al administrador.' },
        { status: 403 }
      )
    }

    // 4. Generar nuevo hash con bcrypt
    const passwordHash = await hashPassword(newPassword)

    // 5. Actualizar contraseña
    await db.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    })

    // 6. Auditoría
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    await createAuditLog({
      restaurantId: restaurant.id,
      userId: targetUser.id,
      action: 'forgot_password_reset',
      entityType: 'user',
      entityId: targetUser.id,
      details: {
        username: targetUser.username,
        role: targetUser.role,
        restaurantSlug: normalizedSlug,
      },
      ipAddress,
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    })
  } catch (error) {
    return handleApiError('Forgot Password Reset', error)
  }
}
