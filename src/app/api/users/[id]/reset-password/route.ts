// ============================================================
// /api/users/[id]/reset-password
// POST /api/users/[id]/reset-password → Reset user password
//   - super_admin can reset any user below super_admin
//   - super_admin cannot reset another super_admin
//   - admin can reset users in their own restaurant
//   - admin cannot reset super_admin
//   - workers cannot reset passwords
// ============================================================

import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize } from '@/lib/auth'
import { validateInput, resetPasswordSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

// ─── POST /api/users/[id]/reset-password ───────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'users:update')
  if ('error' in auth) return auth.error

  const { user: adminUser } = auth

  try {
    const { id: targetUserId } = await params
    const body = await request.json()

    const validation = validateInput(resetPasswordSchema, body)
    if (!validation.success) return validation.error

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
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
        { success: false, error: 'Usuario no encontrado.' },
        { status: 404 }
      )
    }

    if (targetUser.id === adminUser.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No puedes restablecer tu propia contraseña desde esta opción. Usa cambiar contraseña.',
        },
        { status: 400 }
      )
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede restablecer la contraseña de un super_admin.',
        },
        { status: 403 }
      )
    }

    if (adminUser.role === 'super_admin') {
      // super_admin puede resetear admin, encargado, camarero, cocina, barra y caja.
    } else if (adminUser.role === 'admin') {
      if (!adminUser.restaurantId || targetUser.restaurantId !== adminUser.restaurantId) {
        return NextResponse.json(
          {
            success: false,
            error: 'No puedes restablecer usuarios de otro restaurante.',
          },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Permisos insuficientes para restablecer contraseñas.',
        },
        { status: 403 }
      )
    }

    const passwordHash = await bcrypt.hash(validation.data.newPassword, 10)

    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        restaurantId: true,
        mustChangePassword: true,
      },
    })

    const auditRestaurantId = targetUser.restaurantId ?? adminUser.restaurantId

    if (auditRestaurantId) {
      await createAuditLog({
        restaurantId: auditRestaurantId,
        userId: adminUser.userId,
        action: 'user_password_reset',
        entityType: 'user',
        entityId: targetUser.id,
        details: {
          targetUsername: targetUser.username,
          targetName: targetUser.name,
          targetRole: targetUser.role,
          targetRestaurantId: targetUser.restaurantId,
          resetBy: adminUser.username,
          resetByRole: adminUser.role,
        },
        ipAddress:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida correctamente.',
      user: updatedUser,
    })
  } catch (error) {
    return handleApiError('User Reset Password', error)
  }
}