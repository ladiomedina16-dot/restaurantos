// ============================================================
// /api/orders/[id] — Single order operations
// GET  /api/orders/[id]  → Get order (requires orders:read)
// PUT  /api/orders/[id]  → Update order (requires orders:update)
// Multi-restaurant scoped, Zod validated, audit logged
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, updateOrderSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'
import { emitOrderStatusChanged, emitOrderReady } from '@/lib/realtime'

// ─── GET /api/orders/[id] ───────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'orders:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        table: true,
        client: true,
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        finishedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    })

    // Data isolation: return 404 if order doesn't exist OR doesn't belong to restaurant
    if (!order || order.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    return handleApiError('Order GET', error)
  }
}

// ─── PUT /api/orders/[id] ───────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'orders:update')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params
    const body = await request.json()

    // Zod validation
    const validation = validateInput(updateOrderSchema, body)
    if (!validation.success) return validation.error
    const { status, notes } = validation.data

    const existing = await db.order.findUnique({
      where: { id },
      include: { items: true },
    })

    // Data isolation: return 404 if not found or wrong restaurant
    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // When status changes to "cancelled", restore stock
    if (status === 'cancelled' && existing.status !== 'cancelled') {
      const order = await db.$transaction(async (tx) => {
        // Restore stock for each item
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }

        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id },
          data: { status: 'cancelled' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            table: true,
            client: true,
            createdBy: {
              select: { id: true, username: true, name: true, role: true },
            },
            finishedBy: {
              select: { id: true, username: true, name: true, role: true },
            },
          },
        })

        // Check if table has other active orders (scoped to restaurant)
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: existing.tableId,
            restaurantId,
            status: { notIn: ['paid', 'cancelled'] },
            id: { not: id },
          },
        })

        // If no other active orders, free the table
        if (activeOrdersCount === 0) {
          await tx.table.update({
            where: { id: existing.tableId },
            data: { status: 'available' },
          })
        }

        return updatedOrder
      })

      // Emit real-time status change
      await emitOrderStatusChanged(order)

      // Audit log
      await createAuditLog({
        restaurantId,
        userId: user.userId,
        action: 'order_cancelled',
        entityType: 'order',
        entityId: id,
        details: {
          previousStatus: existing.status,
          tableId: existing.tableId,
        },
      })

      return NextResponse.json({ order })
    }

    // When status changes to "ready", save finishedById
    if (status === 'ready' && existing.status !== 'ready') {
      const order = await db.$transaction(async (tx) => {
        const updateData: Record<string, unknown> = {
          status: 'ready',
          finishedById: user.userId,
        }
        if (notes !== undefined) updateData.notes = notes

        const updatedOrder = await tx.order.update({
          where: { id },
          data: updateData,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            table: true,
            client: true,
            createdBy: {
              select: { id: true, username: true, name: true, role: true },
            },
            finishedBy: {
              select: { id: true, username: true, name: true, role: true },
            },
          },
        })

        return updatedOrder
      })

      // Emit real-time events for status change and ready
      await emitOrderStatusChanged(order)
      await emitOrderReady(order)

      // Audit log
      await createAuditLog({
        restaurantId,
        userId: user.userId,
        action: 'order_status_changed',
        entityType: 'order',
        entityId: id,
        details: {
          from: existing.status,
          to: 'ready',
        },
      })

      return NextResponse.json({ order })
    }

    // When status changes to "paid", potentially free the table
    if (status === 'paid' && existing.status !== 'paid') {
      const order = await db.$transaction(async (tx) => {
        const updateData: Record<string, unknown> = {}
        if (status !== undefined) updateData.status = status
        if (notes !== undefined) updateData.notes = notes

        const updatedOrder = await tx.order.update({
          where: { id },
          data: updateData,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            table: true,
            client: true,
            createdBy: {
              select: { id: true, username: true, name: true, role: true },
            },
            finishedBy: {
              select: { id: true, username: true, name: true, role: true },
            },
          },
        })

        // Check if table has other active (non-paid, non-cancelled) orders (scoped to restaurant)
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: existing.tableId,
            restaurantId,
            status: { notIn: ['paid', 'cancelled'] },
            id: { not: id },
          },
        })

        if (activeOrdersCount === 0) {
          await tx.table.update({
            where: { id: existing.tableId },
            data: { status: 'available' },
          })
        }

        return updatedOrder
      })

      // Emit real-time status change
      await emitOrderStatusChanged(order)

      // Audit log
      await createAuditLog({
        restaurantId,
        userId: user.userId,
        action: 'order_status_changed',
        entityType: 'order',
        entityId: id,
        details: {
          from: existing.status,
          to: 'paid',
        },
      })

      return NextResponse.json({ order })
    }

    // Standard update for other status changes
    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    const order = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        table: true,
        client: true,
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        finishedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    })

    // Emit real-time status change for any status update
    if (status !== undefined && status !== existing.status) {
      await emitOrderStatusChanged(order)

      // Audit log for any status change not caught above
      await createAuditLog({
        restaurantId,
        userId: user.userId,
        action: 'order_status_changed',
        entityType: 'order',
        entityId: id,
        details: {
          from: existing.status,
          to: status,
        },
      })
    }

    return NextResponse.json({ order })
  } catch (error) {
    return handleApiError('Order PUT', error)
  }
}
