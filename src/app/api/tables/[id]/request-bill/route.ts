// ============================================================
// /api/tables/[id]/request-bill — Request the bill for a table
// POST → Mark table as bill_requested and update active orders
// Requires: camarero, encargado, admin, super_admin
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'
import { emitTableStatusChanged, emitOrderStatusChanged } from '@/lib/realtime'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Camarero, encargado, admin, super_admin can request bill
  const auth = authenticateAndAuthorize(request, 'orders:update')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    // Find the table
    const table = await db.table.findFirst({
      where: { id, restaurantId },
      include: {
        orders: {
          where: {
            status: { in: ['pending', 'in_progress', 'ready', 'served'] },
          },
        },
      },
    })

    if (!table) {
      return NextResponse.json(
        { error: 'Mesa no encontrada' },
        { status: 404 }
      )
    }

    if (table.status === 'bill_requested') {
      return NextResponse.json(
        { error: 'La cuenta ya ha sido solicitada para esta mesa.' },
        { status: 400 }
      )
    }

    if (table.status !== 'occupied') {
      return NextResponse.json(
        { error: 'La mesa no está ocupada. No se puede pedir la cuenta.' },
        { status: 400 }
      )
    }

    if (table.orders.length === 0) {
      return NextResponse.json(
        { error: 'No hay pedidos activos en esta mesa.' },
        { status: 400 }
      )
    }

    // Atomic transaction: update table + all active orders
    const result = await db.$transaction(async (tx) => {
      // Update table status
      const updatedTable = await tx.table.update({
        where: { id },
        data: { status: 'bill_requested' },
      })

      // Update all active orders to bill_requested
      const orderIds = table.orders.map((o) => o.id)
      await tx.order.updateMany({
        where: {
          id: { in: orderIds },
          restaurantId,
        },
        data: { status: 'bill_requested' },
      })

      // Fetch updated orders for response
      const updatedOrders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        include: {
          items: { include: { product: true } },
          table: true,
          client: true,
        },
      })

      return { updatedTable, updatedOrders }
    })

    // Emit real-time events
    await emitTableStatusChanged(result.updatedTable)
    for (const order of result.updatedOrders) {
      await emitOrderStatusChanged(order)
    }

    // Audit log
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'bill_requested',
      entityType: 'table',
      entityId: id,
      details: {
        tableNumber: table.number,
        orderCount: table.orders.length,
        orderIds: table.orders.map((o) => o.id),
        requestedBy: user.username,
      },
    })

    return NextResponse.json({
      table: result.updatedTable,
      orders: result.updatedOrders,
      message: `Cuenta solicitada para Mesa ${table.number}`,
    })
  } catch (error) {
    return handleApiError('Request Bill', error)
  }
}
