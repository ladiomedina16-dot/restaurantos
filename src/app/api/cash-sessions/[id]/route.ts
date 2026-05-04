// ============================================================
// /api/cash-sessions/[id] — Single cash session operations
// GET  /api/cash-sessions/[id] → Get a single cash session with payments
// PUT  /api/cash-sessions/[id] → Close a cash session
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, closeCashSessionSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/cash-sessions/[id] ───────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'cash:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const { id } = await params

    const cashSession = await db.cashSession.findFirst({
      where: { id, restaurantId },
      include: {
        openedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        closedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        payments: {
          include: {
            order: {
              select: { id: true, status: true, total: true },
            },
            user: {
              select: { id: true, username: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!cashSession) {
      return Response.json(
        { error: 'Sesión de caja no encontrada.' },
        { status: 404 }
      )
    }

    return Response.json({ cashSession })
  } catch (error) {
    return handleApiError('CashSession GET', error)
  }
}

// ─── PUT /api/cash-sessions/[id] ───────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'cash:close')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const { id } = await params

    const body = await request.json()
    const validation = validateInput(closeCashSessionSchema, body)
    if (!validation.success) return validation.error

    const { closingCash } = validation.data

    // Fetch the cash session with payments
    const cashSession = await db.cashSession.findFirst({
      where: { id, restaurantId },
      include: {
        payments: true,
      },
    })

    if (!cashSession) {
      return Response.json(
        { error: 'Sesión de caja no encontrada.' },
        { status: 404 }
      )
    }

    if (cashSession.status === 'closed') {
      return Response.json(
        { error: 'Esta sesión de caja ya está cerrada.' },
        { status: 400 }
      )
    }

    // Calculate totals from linked payments
    const totalSales = cashSession.payments.reduce((sum, p) => sum + p.amount, 0)
    const totalCard = cashSession.payments
      .filter((p) => p.method === 'tarjeta')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalCash = cashSession.payments
      .filter((p) => p.method === 'efectivo')
      .reduce((sum, p) => sum + p.amount, 0)

    // Calculate expected and difference
    const expectedCash = cashSession.openingCash + totalCash
    const difference = closingCash - expectedCash

    // Close the session
    const closedSession = await db.cashSession.update({
      where: { id },
      data: {
        closingCash,
        expectedCash,
        totalSales,
        totalCard,
        totalCash,
        difference,
        closedById: user.userId,
        closedAt: new Date(),
        status: 'closed',
      },
      include: {
        openedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        closedBy: {
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
    })

    // Create audit log
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'cash_session_closed',
      entityType: 'cash_session',
      entityId: id,
      details: {
        closingCash,
        expectedCash,
        difference,
        totalSales,
        totalCard,
        totalCash,
        closedBy: user.username,
      },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return Response.json({ cashSession: closedSession })
  } catch (error) {
    return handleApiError('CashSession PUT', error)
  }
}
