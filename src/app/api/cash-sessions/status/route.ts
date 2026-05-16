// ============================================================
// /api/cash-sessions/status — Minimal cash session status check
// Returns { open: true | false } without exposing sensitive data.
// Accessible by all authenticated roles (cash:status permission).
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'cash:status')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const session = await db.cashSession.findFirst({
      where: {
        restaurantId,
        status: 'open',
      },
      select: { id: true },
    })

    return Response.json({ open: !!session })
  } catch (error) {
    return handleApiError('CashSessionStatus GET', error)
  }
}
