// ============================================================
// /api/auth/forgot-password — Recuperación de contraseña
// ⚠️ SEGURIDAD CRÍTICA (CWE-640):
// Sin canal externo de verificación de identidad (email transaccional,
// SMS o token OTP de un solo uso con caducidad), permitir el cambio de
// contraseña conociendo únicamente el slug y el nombre de usuario
// constituye un vector de secuestro de cuenta (Account Takeover).
// Este endpoint bloquea la modificación desatendida y redirige al flujo
// seguro administrado por el administrador del restaurante.
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { validateInput, forgotPasswordSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar esquema Zod
    const validation = validateInput(forgotPasswordSchema, body)
    if (!validation.success) return validation.error

    const { restaurantSlug, username } = validation.data
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

    // 4. BLOQUEO DE SEGURIDAD (CWE-640):
    // Sin canal externo de verificación de identidad, se bloquea el reseteo desatendido.
    return NextResponse.json(
      {
        error:
          'El restablecimiento desatendido de contraseñas está deshabilitado por motivos de seguridad. Por favor, solicita al administrador de tu restaurante que restablezca tu acceso desde el panel de gestión de usuarios.',
      },
      { status: 403 }
    )
  } catch (error) {
    return handleApiError('Forgot Password Reset', error)
  }
}
