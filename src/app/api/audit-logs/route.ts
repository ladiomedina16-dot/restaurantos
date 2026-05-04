// ============================================================
// /api/audit-logs — Audit log viewing
// GET /api/audit-logs → List audit logs for user's restaurant
//   Filters: ?action=, ?entityType=, ?userId=, ?from=, ?to=
//   Pagination: ?take=50&skip=0
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/audit-logs ───────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'audit:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const userId = searchParams.get('userId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const take = parseInt(searchParams.get('take') ?? '50', 10)
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)

    // Build where clause
    const where: Record<string, unknown> = { restaurantId }

    if (action) {
      where.action = action
    }

    if (entityType) {
      where.entityType = entityType
    }

    if (userId) {
      where.userId = userId
    }

    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (from) {
        createdAt.gte = new Date(from)
      }
      if (to) {
        createdAt.lt = new Date(to)
      }
      where.createdAt = createdAt
    }

    // Validate pagination params
    const safeTake = Math.min(Math.max(take, 1), 200)
    const safeSkip = Math.max(skip, 0)

    const [auditLogs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: safeTake,
        skip: safeSkip,
      }),
      db.auditLog.count({ where }),
    ])

    return Response.json({
      auditLogs,
      pagination: {
        total,
        take: safeTake,
        skip: safeSkip,
        hasMore: safeSkip + safeTake < total,
      },
    })
  } catch (error) {
    return handleApiError('AuditLogs GET', error)
  }
}
