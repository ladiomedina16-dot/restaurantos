// ============================================================
// /api/cash-sessions — Cash session management
// GET  /api/cash-sessions → List cash sessions for user's restaurant
// POST /api/cash-sessions → Open a new cash session
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, openCashSessionSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/cash-sessions ────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'cash:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const current = searchParams.get('current')

    const where: Record<string, unknown> = { restaurantId }

    if (status) {
      where.status = status
    }

    // ?current=true → get the current open session
    if (current === 'true') {
      where.status = 'open'

      const openSession = await db.cashSession.findFirst({
        where,
        include: {
          openedBy: {
            select: { id: true, username: true, name: true, role: true },
          },
          payments: {
            include: {
              order: {
                select: { id: true, status: true, total: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { openedAt: 'desc' },
      })

      return Response.json({ cashSession: openSession })
    }

    const cashSessions = await db.cashSession.findMany({
      where,
      include: {
        openedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        closedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        _count: {
          select: { payments: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    })

    return Response.json({ cashSessions })
  } catch (error) {
    return handleApiError('CashSessions GET', error)
  }
}

// ─── POST /api/cash-sessions ───────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'cash:open')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const body = await request.json()
    const validation = validateInput(openCashSessionSchema, body)
    if (!validation.success) return validation.error

    const { openingCash } = validation.data

    // Check that there's no already-open session for the restaurant
    const existingOpen = await db.cashSession.findFirst({
      where: {
        restaurantId,
        status: 'open',
      },
    })

    if (existingOpen) {
      return Response.json(
        { error: 'Ya existe una sesión de caja abierta para este restaurante.' },
        { status: 409 }
      )
    }

    const cashSession = await db.cashSession.create({
      data: {
        restaurantId,
        openedById: user.userId,
        openingCash,
        status: 'open',
      },
      include: {
        openedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    })

    // Create audit log
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'cash_session_opened',
      entityType: 'cash_session',
      entityId: cashSession.id,
      details: { openingCash, openedBy: user.username },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return Response.json({ cashSession }, { status: 201 })
  } catch (error) {
    return handleApiError('CashSessions POST', error)
  }
}
