// ============================================================
// /api/supplier-payments — Supplier payment management
// GET  /api/supplier-payments → List supplier payments for restaurant
// POST /api/supplier-payments → Create a supplier payment
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, createSupplierPaymentSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/supplier-payments ────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'cash:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const { searchParams } = new URL(request.url)
    const cashSessionId = searchParams.get('cashSessionId')

    const where: Record<string, unknown> = { restaurantId }

    if (cashSessionId) {
      where.cashSessionId = cashSessionId
    }

    const supplierPayments = await db.supplierPayment.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ supplierPayments })
  } catch (error) {
    return handleApiError('SupplierPayments GET', error)
  }
}

// ─── POST /api/supplier-payments ───────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'cash:open')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    // Verify there's an open cash session
    const openSession = await db.cashSession.findFirst({
      where: { restaurantId, status: 'open' },
    })

    if (!openSession) {
      return Response.json(
        { error: 'No hay sesión de caja abierta. Abre caja antes de registrar pagos a proveedores.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = validateInput(createSupplierPaymentSchema, body)
    if (!validation.success) return validation.error

    const { concept, amount } = validation.data

    const supplierPayment = await db.$transaction(async (tx) => {
      const sp = await tx.supplierPayment.create({
        data: {
          concept,
          amount,
          userId: user.userId,
          restaurantId,
          cashSessionId: openSession.id,
        },
        include: {
          user: {
            select: { id: true, username: true, name: true },
          },
        },
      })

      // Update CashSession totalSuppliers atomically
      await tx.cashSession.update({
        where: { id: openSession.id },
        data: {
          totalSuppliers: { increment: Math.round(amount * 100) / 100 },
        },
      })

      return sp
    })

    // Audit log
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'supplier_payment_created',
      entityType: 'supplier_payment',
      entityId: supplierPayment.id,
      details: { concept, amount, cashSessionId: openSession.id },
    })

    return Response.json({ supplierPayment }, { status: 201 })
  } catch (error) {
    return handleApiError('SupplierPayments POST', error)
  }
}
