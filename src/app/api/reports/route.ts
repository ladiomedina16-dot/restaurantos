// ============================================================
// /api/reports — Reporting endpoints
// GET /api/reports?type=...&dateFrom=...&dateTo=...
// Requires dashboard:read permission (encargado, admin, super_admin)
// All queries scoped to restaurantId via requireRestaurantScope
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, reportsQuerySchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'dashboard:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    // Parse query params
    const { searchParams } = new URL(request.url)
    const query = {
      type: searchParams.get('type') ?? '',
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    }

    // Validate input
    const validation = validateInput(reportsQuerySchema, query)
    if (!validation.success) return validation.error
    const { type, dateFrom, dateTo } = validation.data

    // Default date range: today
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const dateFromParsed = dateFrom ? new Date(dateFrom) : todayStart
    const dateToParsed = dateTo ? new Date(dateTo) : todayEnd

    switch (type) {
      case 'daily_sales':
        return await dailySalesReport(restaurantId, dateFromParsed, dateToParsed)
      case 'payment_methods':
        return await paymentMethodsReport(restaurantId, dateFromParsed, dateToParsed)
      case 'top_products':
        return await topProductsReport(restaurantId, dateFromParsed, dateToParsed)
      case 'cancelled_orders':
        return await cancelledOrdersReport(restaurantId, dateFromParsed, dateToParsed)
      case 'cash_closes':
        return await cashClosesReport(restaurantId, dateFromParsed, dateToParsed)
      case 'sales_by_user':
        return await salesByUserReport(restaurantId, dateFromParsed, dateToParsed)
      case 'bar_orders':
        return await barOrdersReport(restaurantId, dateFromParsed, dateToParsed)
      case 'kitchen_orders':
        return await kitchenOrdersReport(restaurantId, dateFromParsed, dateToParsed)
      default:
        return Response.json({ error: 'Tipo de reporte no válido' }, { status: 400 })
    }
  } catch (error) {
    return handleApiError('Reports GET', error)
  }
}

// ─── daily_sales ───────────────────────────────────────────
// Total sales for the date range, grouped by day
async function dailySalesReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const orders = await db.order.findMany({
    where: {
      restaurantId,
      status: { notIn: ['cancelled'] },
      createdAt: {
        gte: dateFrom,
        lt: dateTo,
      },
    },
    select: {
      total: true,
      createdAt: true,
    },
  })

  // Group by day
  const dayMap = new Map<string, { revenue: number; orders: number }>()

  for (const order of orders) {
    const d = new Date(order.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const existing = dayMap.get(key)
    if (existing) {
      existing.revenue += order.total
      existing.orders += 1
    } else {
      dayMap.set(key, { revenue: order.total, orders: 1 })
    }
  }

  const days = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalRevenue = Math.round(days.reduce((sum, d) => sum + d.revenue, 0) * 100) / 100
  const totalOrders = days.reduce((sum, d) => sum + d.orders, 0)
  const avgTicket = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0

  return Response.json({
    report: {
      totalRevenue,
      totalOrders,
      avgTicket,
      days,
    },
  })
}

// ─── payment_methods ───────────────────────────────────────
// Sales grouped by payment method (efectivo/tarjeta)
async function paymentMethodsReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const payments = await db.payment.findMany({
    where: {
      order: {
        restaurantId,
        status: { notIn: ['cancelled'] },
      },
      createdAt: {
        gte: dateFrom,
        lt: dateTo,
      },
    },
    select: {
      amount: true,
      method: true,
    },
  })

  const efectivo = { count: 0, total: 0 }
  const tarjeta = { count: 0, total: 0 }

  for (const payment of payments) {
    if (payment.method === 'efectivo') {
      efectivo.count += 1
      efectivo.total += payment.amount
    } else if (payment.method === 'tarjeta') {
      tarjeta.count += 1
      tarjeta.total += payment.amount
    }
  }

  // Round totals
  efectivo.total = Math.round(efectivo.total * 100) / 100
  tarjeta.total = Math.round(tarjeta.total * 100) / 100
  const total = Math.round((efectivo.total + tarjeta.total) * 100) / 100

  return Response.json({
    report: {
      efectivo,
      tarjeta,
      total,
    },
  })
}

// ─── top_products ──────────────────────────────────────────
// Top selling products by quantity and revenue
async function topProductsReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const topItems = await db.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        restaurantId,
        status: { notIn: ['cancelled'] },
        createdAt: {
          gte: dateFrom,
          lt: dateTo,
        },
      },
    },
    _sum: {
      quantity: true,
      subtotal: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 50,
  })

  // Enrich with product names
  const report = await Promise.all(
    topItems.map(async (item) => {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { name: true },
      })
      return {
        productId: item.productId,
        name: product?.name ?? 'Desconocido',
        totalQuantity: item._sum.quantity ?? 0,
        totalRevenue: Math.round((item._sum.subtotal ?? 0) * 100) / 100,
      }
    })
  )

  return Response.json({ report })
}

// ─── cancelled_orders ──────────────────────────────────────
// List of cancelled orders in date range with reasons
async function cancelledOrdersReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const cancelledOrders = await db.order.findMany({
    where: {
      restaurantId,
      status: 'cancelled',
      updatedAt: {
        gte: dateFrom,
        lt: dateTo,
      },
    },
    include: {
      items: {
        include: {
          product: {
            select: { name: true },
          },
        },
      },
      table: {
        select: { number: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const totalCancelled = cancelledOrders.length
  const totalLost = Math.round(
    cancelledOrders.reduce((sum, o) => sum + o.total, 0) * 100
  ) / 100

  const orders = cancelledOrders.map((o) => ({
    id: o.id,
    table: o.table.number,
    total: o.total,
    cancelledAt: o.updatedAt,
    items: o.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      notes: item.notes,
    })),
  }))

  return Response.json({
    report: {
      totalCancelled,
      totalLost,
      orders,
    },
  })
}

// ─── cash_closes ───────────────────────────────────────────
// List of cash session closes in date range with totals and differences
async function cashClosesReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const sessions = await db.cashSession.findMany({
    where: {
      restaurantId,
      status: 'closed',
      closedAt: {
        gte: dateFrom,
        lt: dateTo,
      },
    },
    include: {
      openedBy: {
        select: { username: true },
      },
      closedBy: {
        select: { username: true },
      },
    },
    orderBy: { closedAt: 'desc' },
  })

  const report = sessions.map((s) => ({
    id: s.id,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    openingCash: s.openingCash,
    closingCash: s.closingCash ?? 0,
    expectedCash: s.expectedCash ?? 0,
    difference: s.difference ?? 0,
    totalSales: s.totalSales,
    totalCash: s.totalCash,
    totalCard: s.totalCard,
    openedBy: s.openedBy.username,
    closedBy: s.closedBy?.username ?? '',
  }))

  return Response.json({ report })
}

// ─── sales_by_user ──────────────────────────────────────────
// Total sales grouped by user (camarero who created the order)
async function salesByUserReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const orders = await db.order.findMany({
    where: {
      restaurantId,
      status: { notIn: ['cancelled'] },
      createdAt: {
        gte: dateFrom,
        lt: dateTo,
      },
    },
    select: {
      createdById: true,
      createdBy: {
        select: { name: true, username: true },
      },
      total: true,
    },
  })

  const userMap = new Map<string, { userName: string; totalOrders: number; totalRevenue: number }>()

  for (const order of orders) {
    const userId = order.createdById ?? 'unknown'
    const existing = userMap.get(userId)
    if (existing) {
      existing.totalOrders += 1
      existing.totalRevenue += order.total
    } else {
      const userName = order.createdBy
        ? (order.createdBy.name || order.createdBy.username)
        : 'Desconocido'
      userMap.set(userId, { userName, totalOrders: 1, totalRevenue: order.total })
    }
  }

  const report = Array.from(userMap.entries()).map(([userId, data]) => ({
    userId,
    userName: data.userName,
    totalOrders: data.totalOrders,
    totalRevenue: Math.round(data.totalRevenue * 100) / 100,
  }))

  return Response.json({ report })
}

// ─── bar_orders ──────────────────────────────────────────────
// Count and revenue of bar items (bebidas) in date range
async function barOrdersReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const items = await db.orderItem.findMany({
    where: {
      order: {
        restaurantId,
        status: { notIn: ['cancelled'] },
        createdAt: {
          gte: dateFrom,
          lt: dateTo,
        },
      },
      product: {
        category: 'bebida',
      },
    },
    select: {
      quantity: true,
      subtotal: true,
      orderId: true,
    },
  })

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalRevenue = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100
  const orderIds = new Set(items.map((item) => item.orderId))

  return Response.json({
    report: {
      totalItems,
      totalRevenue,
      orders: orderIds.size,
    },
  })
}

// ─── kitchen_orders ──────────────────────────────────────────
// Count and revenue of kitchen items (non-bebida) in date range
async function kitchenOrdersReport(restaurantId: string, dateFrom: Date, dateTo: Date) {
  const items = await db.orderItem.findMany({
    where: {
      order: {
        restaurantId,
        status: { notIn: ['cancelled'] },
        createdAt: {
          gte: dateFrom,
          lt: dateTo,
        },
      },
      product: {
        category: { not: 'bebida' },
      },
    },
    select: {
      quantity: true,
      subtotal: true,
      orderId: true,
    },
  })

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalRevenue = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100
  const orderIds = new Set(items.map((item) => item.orderId))

  return Response.json({
    report: {
      totalItems,
      totalRevenue,
      orders: orderIds.size,
    },
  })
}
