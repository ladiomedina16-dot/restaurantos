// ============================================================
// /api/orders/[id] — Single order operations
// GET  /api/orders/[id]  → Get order (requires orders:read)
// PUT  /api/orders/[id]  → Update order (requires orders:update)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize } from '@/lib/auth'
import { emitOrderStatusChanged, emitOrderReady } from '@/lib/realtime'

// ─── GET /api/orders/[id] ───────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'orders:read')
  if ('error' in auth) return auth.error

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

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Order GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
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

  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body as {
      status?: string
      notes?: string
    }

    const existing = await db.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const validStatuses = [
      'pending',
      'in_progress',
      'ready',
      'served',
      'paid',
      'cancelled',
    ]

    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
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

        // Check if table has other active orders
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: existing.tableId,
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

        // Check if table has other active (non-paid, non-cancelled) orders
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: existing.tableId,
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
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Order PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
