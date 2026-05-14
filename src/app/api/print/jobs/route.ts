// ============================================================
// /api/print/jobs — Print job queue
// GET /api/print/jobs?destination=kitchen|bar|receipt
//   Returns pending print jobs for the given destination.
//   Role-based filtering:
//     cocina → only kitchen
//     barra  → only bar
//     caja / admin / encargado → receipt
//     super_admin → all
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'

// ─── Destination access matrix by role ──────────────────────
const DESTINATION_ACCESS: Record<string, string[]> = {
  super_admin: ['kitchen', 'bar', 'receipt'],
  admin:       ['kitchen', 'bar', 'receipt'],
  encargado:   ['kitchen', 'bar', 'receipt'],
  cocina:      ['kitchen'],
  barra:       ['bar'],
  caja:        ['receipt'],
  camarero:    [], // camareros don't poll print jobs
}

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'print:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const { searchParams } = new URL(request.url)
    const destination = searchParams.get('destination')

    if (!destination) {
      return Response.json(
        { error: 'Parámetro "destination" requerido (kitchen|bar|receipt)' },
        { status: 400 }
      )
    }

    // Role-based destination check
    const allowedDests = DESTINATION_ACCESS[user.role] ?? []
    if (!allowedDests.includes(destination) && !allowedDests.includes('*')) {
      return Response.json(
        { error: 'No tienes permiso para consultar trabajos de este destino.' },
        { status: 403 }
      )
    }

    // Fetch pending jobs for this restaurant + destination
    const jobs = await db.printJob.findMany({
      where: {
        restaurantId,
        destination,
        status: 'pending',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        destination: true,
        status: true,
        html: true,
        createdAt: true,
      },
    })

    return Response.json({ jobs })
  } catch (error) {
    return handleApiError('PrintJobs GET', error)
  }
}
