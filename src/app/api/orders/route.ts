// ============================================================
// /api/orders — Order management
// GET  /api/orders       → List orders (requires orders:read)
// POST /api/orders       → Create order (requires orders:create)
// Multi-restaurant scoped, Zod validated, audit logged
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, createOrderSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'
import { emitOrderCreated } from '@/lib/realtime'

// ─── GET /api/orders ────────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'orders:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tableId = searchParams.get('tableId')
    const clientId = searchParams.get('clientId')

    const where: Record<string, unknown> = { restaurantId }

    if (status) {
      // Support comma-separated statuses for kitchen KDS
      if (status.includes(',')) {
        where.status = { in: status.split(',') }
      } else {
        where.status = status
      }
    }

    if (tableId) {
      where.tableId = tableId
    }

    if (clientId) {
      where.clientId = clientId
    }

    const orders = await db.order.findMany({
      where,
      include: {
        table: true,
        client: true,
        items: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        finishedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    return handleApiError('Orders GET', error)
  }
}

// ─── POST /api/orders ───────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'orders:create')
  if ('error' in auth) return auth.error
  const { user } = auth

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const body = await request.json()

    // Zod validation
    const validation = validateInput(createOrderSchema, body)
    if (!validation.success) return validation.error
    const { tableId, clientId, notes, items } = validation.data

    // Validate table exists AND belongs to this restaurant
    const table = await db.table.findFirst({
      where: { id: tableId, restaurantId },
    })
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Validate client if provided — must belong to this restaurant
    if (clientId) {
      const client = await db.client.findFirst({
        where: { id: clientId, restaurantId },
      })
      if (!client) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
    }

    // Fetch all products in the order (prices from DB only)
    // Only products belonging to this restaurant
    const productIds = items.map((item) => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds }, restaurantId },
    })

    // Validate all products exist and have sufficient stock
    const productMap = new Map(products.map((p) => [p.id, p]))
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        )
      }
      if (!product.active) {
        return NextResponse.json(
          { error: `Product "${product.name}" is not available` },
          { status: 400 }
        )
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Sin stock: "${product.name}". Disponible: ${product.stock}, Pedido: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // Calculate subtotals from DB prices only, include modifiers
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId)!
      const unitPrice = product.price
      const subtotal = unitPrice * item.quantity
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        notes: item.notes ?? '',
        modifiers: item.modifiers ? JSON.stringify(item.modifiers) : '',
      }
    })

    const subtotal = orderItemsData.reduce((sum, item) => sum + item.subtotal, 0)

    // Use transaction to ensure atomicity
    const order = await db.$transaction(async (tx) => {
      // Create the order with items (discount = 0 initially, applied at payment)
      const newOrder = await tx.order.create({
        data: {
          tableId,
          clientId: clientId ?? null,
          notes: notes ?? '',
          subtotal,
          discount: 0,
          total: subtotal,
          status: 'pending',
          createdById: user.userId,
          restaurantId,
          items: {
            create: orderItemsData,
          },
        },
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
        },
      })

      // Decrement stock for each product
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Update table status to occupied
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'occupied' },
      })

      // If clientId provided, increment visits
      // Points are added at payment (caja), not at order creation
      if (clientId) {
        await tx.client.update({
          where: { id: clientId },
          data: {
            visits: { increment: 1 },
          },
        })
      }

      return newOrder
    })

    // Emit real-time event after successful order creation
    await emitOrderCreated(order)

    // Audit log
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'order_created',
      entityType: 'order',
      entityId: order.id,
      details: {
        tableId,
        clientId: clientId ?? null,
        itemCount: items.length,
        subtotal,
        total: subtotal,
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    return handleApiError('Orders POST', error)
  }
}
