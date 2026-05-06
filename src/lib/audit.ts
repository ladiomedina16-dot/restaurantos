// ============================================================
// Audit logging utility
// Records critical actions for compliance and traceability
// ============================================================

import { db } from '@/lib/db'

export type AuditAction =
  | 'order_created'
  | 'order_status_changed'
  | 'order_cancelled'
  | 'payment_processed'
  | 'cash_session_opened'
  | 'cash_session_closed'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'table_created'
  | 'table_updated'
  | 'table_deleted'
  | 'client_created'
  | 'client_updated'
  | 'client_deleted'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'login_success'
  | 'login_failed'
  | 'print_ticket'
  | 'password_changed'
  | 'password_reset'
  | 'onboarding_completed'
  | 'subscription_changed'
  | 'restaurant_deleted'
  | 'supplier_payment_created'
  | 'user_deleted'
  | 'user_password_reset'

export type EntityType =
  | 'order'
  | 'payment'
  | 'cash_session'
  | 'table'
  | 'product'
  | 'client'
  | 'user'
  | 'auth'
  | 'restaurant'
  | 'supplier_payment'

interface AuditParams {
  restaurantId: string
  userId?: string
  action: AuditAction
  entityType: EntityType
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

/**
 * Create an audit log entry. Non-blocking — errors are logged but don't fail the request.
 */
export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        restaurantId: params.restaurantId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: params.details ? JSON.stringify(params.details) : '',
        ipAddress: params.ipAddress ?? '',
      },
    })
  } catch (error) {
    console.error('[AUDIT] Failed to create audit log:', error)
  }
}

/**
 * Get the restaurant ID from the authenticated user.
 * For super_admin, uses the provided restaurantId or throws.
 * For others, uses the user's restaurantId.
 */
export function getRestaurantId(user: { userId: string; role: string; restaurantId?: string }, explicitRestaurantId?: string): string {
  // super_admin must provide restaurantId explicitly
  if (user.role === 'super_admin') {
    if (!explicitRestaurantId) {
      throw new Error('super_admin must specify a restaurantId')
    }
    return explicitRestaurantId
  }
  // Other users are scoped to their restaurant
  if (!user.restaurantId) {
    throw new Error('User has no restaurant assigned')
  }
  return user.restaurantId
}
