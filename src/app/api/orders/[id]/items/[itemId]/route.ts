// ============================================================
// /api/orders/[id]/items/[itemId] — Per-item status operations
// GET   /api/orders/[id]/items/[itemId] → Get order with items filtered by destination
// PATCH /api/orders/[id]/items/[itemId] → Update item status (e.g., mark as ready)
// Multi-restaurant scoped, audit logged, real-time events
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'
import { emitOrderStatusChanged, emitOrderReady } from '@/lib/realtime'
import { z } from 'zod'

// ─── Validation schema ─────────────────────────────────────

const updateItemStatusSchema = z.object({
  status: z.enum(['pending', 'ready']),
})

// ─── GET /api/orders/[id]/items/[itemId] ────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'orders:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id, itemId } = await params
    const { searchParams } = new URL(request.url)
    const destination = searchParams.get('destination') // 'bar' or 'kitchen'

    // Validate item belongs to the order and restaurant
    const item = await db.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    })

    if (!item || item.orderId !== id || item.order.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Return the order with items filtered by destination
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          where: destination ? { destination } : undefined,
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

    if (!order || order.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    return handleApiError('Order Item GET', error)
  }
}

// ─── PATCH /api/orders/[id]/items/[itemId] ──────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'orders:update')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id, itemId } = await params
    const body = await request.json()

    // Validate input
    const validation = validateInput(updateItemStatusSchema, body)
    if (!validation.success) return validation.error
    const { status: newStatus } = validation.data

    // Validate item exists and belongs to the order and restaurant
    const item = await db.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    })

    if (!item || item.orderId !== id || item.order.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Don't allow status change if it's the same
    if (item.status === newStatus) {
      return NextResponse.json(
        { error: `Item is already ${newStatus}` },
        { status: 400 }
      )
    }

    // Use transaction for atomic updates
    const result = await db.$transaction(async (tx) => {
      // Update the item status
      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: { status: newStatus },
        include: { product: true },
      })

      // Check all items in the order to determine order status
      const allItems = await tx.orderItem.findMany({
        where: { orderId: id },
      })

      const allReady = allItems.every((i) => i.status === 'ready')
      const someReady = allItems.some((i) => i.status === 'ready')

      let orderStatus: string | null = null
      let finishedById: string | null = null

      if (allReady) {
        // All items are ready → auto-transition order to "ready"
        orderStatus = 'ready'
        finishedById = user.userId
      } else if (someReady && item.order.status === 'pending') {
        // Some items ready, order still pending → move to in_progress
        orderStatus = 'in_progress'
      }

      // Update order status if needed
      if (orderStatus) {
        const updateData: Record<string, unknown> = { status: orderStatus }
        if (finishedById) {
          updateData.finishedById = finishedById
        }
        await tx.order.update({
          where: { id },
          data: updateData,
        })
      }

      // Fetch the current order state
      const currentOrder = await tx.order.findUnique({
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

      return { updatedItem, currentOrder, orderStatus }
    })

    // Emit real-time events
    if (result.currentOrder) {
      await emitOrderStatusChanged(result.currentOrder)

      // If order transitioned to "ready", also emit order-ready event
      if (result.orderStatus === 'ready') {
        await emitOrderReady(result.currentOrder)
      }
    }

    // Audit log for item status change
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'order_status_changed',
      entityType: 'order',
      entityId: id,
      details: {
        itemId,
        itemStatusFrom: item.status,
        itemStatusTo: newStatus,
        orderStatusFrom: item.order.status,
        orderStatusTo: result.orderStatus || item.order.status,
      },
    })

    return NextResponse.json({
      item: result.updatedItem,
      orderStatus: result.currentOrder?.status,
    })
  } catch (error) {
    return handleApiError('Order Item PATCH', error)
  }
}
