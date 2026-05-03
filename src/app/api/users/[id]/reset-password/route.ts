// ============================================================
// /api/users/[id]/reset-password — Admin reset another user's password
// POST: { newPassword }
// Only admin/super_admin/encargado can reset another user's password
// Sets mustChangePassword: true on the target user, audit logs
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, hasPermission, hashPassword, type UserRole } from '@/lib/auth'
import { validateInput, resetPasswordSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'users:update')
  if ('error' in auth) return auth.error
  const { user: adminUser } = auth

  // Only admin, super_admin, or encargado can reset passwords
  if (!hasPermission(adminUser.role as UserRole, 'users:update') || 
      !['super_admin', 'admin', 'encargado'].includes(adminUser.role)) {
    return NextResponse.json(
      { error: 'Permisos insuficientes para restablecer contraseñas.' },
      { status: 403 }
    )
  }

  try {
    const { id: targetUserId } = await params
    const body = await request.json()

    // Zod validation
    const validation = validateInput(resetPasswordSchema, body)
    if (!validation.success) return validation.error

    const { newPassword } = validation.data

    // Fetch target user
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, restaurantId: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      )
    }

    // Non-super_admin can only reset passwords within their own restaurant
    if (adminUser.role !== 'super_admin' && targetUser.restaurantId !== adminUser.restaurantId) {
      return NextResponse.json(
        { error: 'No puede restablecer la contraseña de un usuario de otro restaurante.' },
        { status: 403 }
      )
    }

    // Non-super_admin cannot reset super_admin passwords
    if (targetUser.role === 'super_admin' && adminUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'No puede restablecer la contraseña de un super_admin.' },
        { status: 403 }
      )
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password and force password change on next login
    await db.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: true,
      },
    })

    // Audit log
    const auditRestaurantId = targetUser.restaurantId ?? adminUser.restaurantId ?? 'unknown'
    await createAuditLog({
      restaurantId: auditRestaurantId,
      userId: adminUser.userId,
      action: 'password_reset',
      entityType: 'user',
      entityId: targetUserId,
      details: {
        targetUsername: targetUser.username,
        targetRole: targetUser.role,
        forcedPasswordChange: true,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    })

    return NextResponse.json({ success: true, message: 'Contraseña restablecida. El usuario deberá cambiarla en su próximo inicio de sesión.' })
  } catch (error) {
    return handleApiError('Reset Password', error)
  }
}
