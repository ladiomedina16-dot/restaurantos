// ============================================================
// /api/users/[id]
// DELETE /api/users/[id] → Delete user safely
//   - super_admin can delete any user below super_admin
//   - super_admin cannot delete another super_admin
//   - admin can delete users in their own restaurant
//   - admin cannot delete super_admin
//   - workers cannot delete users
//   - If user has history, soft delete: active=false
//   - If user has no history, hard delete
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize } from '@/lib/auth'
import { validateInput, deleteUserSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

// ─── DELETE /api/users/[id] ────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'users:delete')
  if ('error' in auth) return auth.error

  const { user: adminUser } = auth

  try {
    const { id: targetUserId } = await params

    const validation = validateInput(deleteUserSchema, { id: targetUserId })
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
        { success: false, error: 'No puede eliminar su propio usuario.' },
        { status: 400 }
      )
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar un usuario super_admin.' },
        { status: 403 }
      )
    }

    if (adminUser.role === 'super_admin') {
      // super_admin puede eliminar cualquier usuario inferior.
    } else if (adminUser.role === 'admin') {
      if (!adminUser.restaurantId || targetUser.restaurantId !== adminUser.restaurantId) {
        return NextResponse.json(
          { success: false, error: 'No puede eliminar un usuario de otro restaurante.' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Permisos insuficientes para eliminar usuarios.' },
        { status: 403 }
      )
    }

    const auditRestaurantId = targetUser.restaurantId ?? adminUser.restaurantId

    if (!auditRestaurantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar el restaurante para auditoría.' },
        { status: 400 }
      )
    }

    const [
      createdOrders,
      finishedOrders,
      payments,
      openedCashSessions,
      closedCashSessions,
      supplierPayments,
      auditLogs,
    ] = await Promise.all([
      db.order.count({ where: { createdById: targetUserId } }),
      db.order.count({ where: { finishedById: targetUserId } }),
      db.payment.count({ where: { userId: targetUserId } }),
      db.cashSession.count({ where: { openedById: targetUserId } }),
      db.cashSession.count({ where: { closedById: targetUserId } }),
      db.supplierPayment.count({ where: { userId: targetUserId } }),
      db.auditLog.count({ where: { userId: targetUserId } }),
    ])

    const hasHistory =
      createdOrders > 0 ||
      finishedOrders > 0 ||
      payments > 0 ||
      openedCashSessions > 0 ||
      closedCashSessions > 0 ||
      supplierPayments > 0 ||
      auditLogs > 0

    await createAuditLog({
      restaurantId: auditRestaurantId,
      userId: adminUser.userId,
      action: 'user_deleted',
      entityType: 'user',
      entityId: targetUser.id,
      details: {
        targetUsername: targetUser.username,
        targetName: targetUser.name,
        targetRole: targetUser.role,
        targetRestaurantId: targetUser.restaurantId,
        mode: hasHistory ? 'soft_delete' : 'hard_delete',
        dependencies: {
          createdOrders,
          finishedOrders,
          payments,
          openedCashSessions,
          closedCashSessions,
          supplierPayments,
          auditLogs,
        },
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        '',
    })

    if (hasHistory) {
      const safeUsername = `${targetUser.username}_deleted_${Date.now()}`

      await db.user.update({
        where: { id: targetUserId },
        data: {
          active: false,
          username: safeUsername,
          name: targetUser.name
            ? `${targetUser.name} (eliminado)`
            : 'Usuario eliminado',
        },
      })

      return NextResponse.json({
        success: true,
        message:
          'Usuario desactivado correctamente. Tiene historial operativo y no se eliminó físicamente.',
        deletedUserId: targetUserId,
        mode: 'soft_delete',
      })
    }

    await db.user.delete({
      where: { id: targetUserId },
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente.',
      deletedUserId: targetUserId,
      mode: 'hard_delete',
    })
  } catch (error) {
    return handleApiError('User DELETE', error)
  }
}