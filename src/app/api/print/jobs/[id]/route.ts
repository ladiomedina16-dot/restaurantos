// ============================================================
// /api/print/jobs/[id] — Update a print job status
// PATCH → Mark a print job as printed or failed
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'

const patchPrintJobSchema = z.object({
  status: z.enum(['printed', 'failed']),
  error: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'print:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const { id } = await params
    const body = await request.json()
    const validation = patchPrintJobSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        {
          error: `Validación fallida: ${validation.error.issues
            .map((e) => e.message)
            .join('; ')}`,
        },
        { status: 400 }
      )
    }

    const { status, error: errorMsg } = validation.data

    // Find the job and verify it belongs to this restaurant
    const job = await db.printJob.findFirst({
      where: { id, restaurantId },
    })

    if (!job) {
      return Response.json(
        { error: 'Trabajo de impresión no encontrado.' },
        { status: 404 }
      )
    }

    const updated = await db.printJob.update({
      where: { id },
      data: {
        status,
        error: errorMsg ?? '',
        printedAt: status === 'printed' ? new Date() : undefined,
      },
    })

    return Response.json({ job: updated })
  } catch (error) {
    return handleApiError('PrintJob PATCH', error)
  }
}