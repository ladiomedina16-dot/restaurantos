import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

interface OrderItemInput {
  productId: string
  quantity: number
  notes?: string
}

interface CreateOrderInput {
  tableId: string
  clientId?: string
  notes?: string
  items: OrderItemInput[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tableId = searchParams.get('tableId')
    const clientId = searchParams.get('clientId')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
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
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Orders GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tableId, clientId, notes, items } = body as CreateOrderInput

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must have at least one item' },
        { status: 400 }
      )
    }

    // Validate table exists
    const table = await db.table.findUnique({ where: { id: tableId } })
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Validate client if provided
    if (clientId) {
      const client = await db.client.findUnique({ where: { id: clientId } })
      if (!client) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
    }

    // Fetch all products in the order
    const productIds = items.map((item) => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
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
          { error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // Calculate subtotals and total
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
      }
    })

    const total = orderItemsData.reduce((sum, item) => sum + item.subtotal, 0)

    // Use transaction to ensure atomicity
    const order = await db.$transaction(async (tx) => {
      // Create the order with items
      const newOrder = await tx.order.create({
        data: {
          tableId,
          clientId: clientId ?? null,
          notes: notes ?? '',
          total,
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

      // If clientId provided, increment visits and add loyalty points (1 point per euro spent)
      if (clientId) {
        const pointsToAdd = Math.floor(total)
        await tx.client.update({
          where: { id: clientId },
          data: {
            visits: { increment: 1 },
            points: { increment: pointsToAdd },
          },
        })
      }

      return newOrder
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Orders POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
