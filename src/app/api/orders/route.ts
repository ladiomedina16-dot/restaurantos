// ============================================================
// /api/orders — Order management
// GET  /api/orders       → List orders (requires orders:read)
// POST /api/orders       → Create order (requires orders:create)
// Multi-restaurant scoped, Zod validated, audit logged
// v5: destination calculated by backend (bebida→bar, else→kitchen)
//     cancelledBy included in GET responses
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope, requireActiveSubscription, getZoneFilter } from '@/lib/auth'
import { validateInput, createOrderSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'
import { emitOrderCreated } from '@/lib/realtime'

// ─── Shared include for order queries ──────────────────────────
const orderInclude = {
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
  cancelledBy: {
    select: { id: true, username: true, name: true, role: true },
  },
}

// ─── GET /api/orders ────────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'orders:read')
  if ('error' in auth) {
    console.log('[Orders GET] ❌ authenticateAndAuthorize FAILED — no permission or bad token')
    return auth.error
  }
  const { user } = auth

  console.log(`[Orders GET] User: role=${user.role}, restaurantId=${user.restaurantId ?? 'MISSING'}, zone=${user.zone ?? 'none'}`)

  const scope = requireRestaurantScope(user, request)
  if ('error' in scope) {
    console.log(`[Orders GET] ❌ requireRestaurantScope FAILED — user.restaurantId=${user.restaurantId ?? 'MISSING'}`)
    return scope.error
  }
  const { restaurantId } = scope

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tableId = searchParams.get('tableId')
    const clientId = searchParams.get('clientId')
    const destination = searchParams.get('destination') // bar | kitchen — filter by item destination

    console.log(`[Orders GET] Params: status=${status}, destination=${destination}, tableId=${tableId}, clientId=${clientId}, restaurantId=${restaurantId}`)

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

    // Zone filtering for camareros: only see orders from tables in their zone
    const userZone = getZoneFilter(user)
    if (userZone) {
      where.table = { zone: userZone }
    }
    console.log(`[Orders GET] Zone filter: ${userZone ?? 'none (all zones)'} — getZoneFilter returned: ${userZone ?? 'null'}`)

    // Destination filtering: only return orders that have items with the matching destination
    // that are NOT yet ready (pending items for that destination)
    if (destination === 'bar' || destination === 'kitchen') {
      where.items = {
        some: {
          destination,
          status: { not: 'ready' }, // only pending items for this destination
        },
      }
    }

    console.log(`[Orders GET] Prisma where:`, JSON.stringify(where, null, 2))

    const orders = await db.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[Orders GET] Raw results: ${orders.length} orders found`)
    // Log each order's items for debugging
    orders.forEach((order) => {
      console.log(`[Orders GET]   Order ${order.id}: status=${order.status}, table=${order.table?.number}, items=${order.items.length}`,
        order.items.map((i) => ({ id: i.id, name: i.product?.name, dest: i.destination, status: i.status }))
      )
    })

    // Debug: log when destination filter is used and results are unexpected
    if (destination && orders.length === 0) {
      // Check if there are ANY orders for this restaurant (to distinguish "no orders" from "no matching orders")
      const totalOrders = await db.order.count({
        where: { restaurantId, status: { in: ['pending', 'in_progress'] } },
      })
      const totalItems = await db.orderItem.count({
        where: { destination, status: { not: 'ready' }, order: { restaurantId } },
      })
      console.log(`[Orders GET] ⚠️ destination=${destination}: 0 results. Total active orders: ${totalOrders}, Total ${destination} pending items: ${totalItems}`)
    }

    // PUNTO 1: When destination is specified, filter items to ONLY include
    // items matching that destination with status !== 'ready'.
    // This prevents Barra from seeing cocina items and vice versa.
    if (destination === 'bar' || destination === 'kitchen') {
      const filteredOrders = orders
        .map((order) => ({
          ...order,
          items: order.items.filter(
            (item) => item.destination === destination && item.status !== 'ready'
          ),
        }))
        .filter((order) => order.items.length > 0) // Remove orders with no matching items

      console.log(`[Orders GET] After item-level filter: ${filteredOrders.length} orders with ${destination} items`)
      return NextResponse.json({ orders: filteredOrders })
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error(`[Orders GET] ❌ Error:`, error)
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

  // SaaS Subscription Guard: block order creation if restaurant is suspended
  const subCheck = await requireActiveSubscription(restaurantId, user.role)
  if ('error' in subCheck) return subCheck.error

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
    // Backend calculates destination based on product category:
    //   bebida → "bar", everything else → "kitchen"
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId)!
      const unitPrice = product.price
      const subtotal = unitPrice * item.quantity
      const destination = product.category === 'bebida' ? 'bar' : 'kitchen'
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        notes: item.notes ?? '',
        modifiers: item.modifiers ? JSON.stringify(item.modifiers) : '',
        destination,
        status: 'pending',
      }
    })

    const subtotal = orderItemsData.reduce((sum, item) => sum + item.subtotal, 0)

    // Debug: log item destinations to verify backend calculation
    console.log('[Orders POST] Item destinations:', orderItemsData.map(i => ({ productId: i.productId, destination: i.destination, status: i.status })))

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
