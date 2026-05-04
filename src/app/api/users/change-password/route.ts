// ============================================================
// /api/users/change-password — Change own password
// POST: { currentPassword, newPassword }
// Requires auth, verifies current password, updates hash,
// sets mustChangePassword to false, audit logs
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateRequest, verifyPassword, hashPassword } from '@/lib/auth'
import { validateInput, changePasswordSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: Request) {
  const auth = authenticateRequest(request)
  if (!auth.success) return auth.response
  const { user } = auth

  try {
    const body = await request.json()

    // Zod validation
    const validation = validateInput(changePasswordSchema, body)
    if (!validation.success) return validation.error

    const { currentPassword, newPassword } = validation.data

    // Fetch current password hash
    const dbUser = await db.user.findUnique({
      where: { id: user.userId },
      select: { id: true, passwordHash: true, mustChangePassword: true, restaurantId: true },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      )
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, dbUser.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Contraseña actual incorrecta.' },
        { status: 400 }
      )
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password and clear mustChangePassword flag
    await db.user.update({
      where: { id: user.userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    })

    // Audit log
    const auditRestaurantId = dbUser.restaurantId ?? 'unknown'
    await createAuditLog({
      restaurantId: auditRestaurantId,
      userId: user.userId,
      action: 'password_changed',
      entityType: 'user',
      entityId: user.userId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    })

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente.' })
  } catch (error) {
    return handleApiError('Change Password', error)
  }
}
