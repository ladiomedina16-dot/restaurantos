// ============================================================
// /api/dashboard — Dashboard analytics
// GET /api/dashboard → Dashboard data (requires dashboard:read)
// Now uses open cash session instead of calendar day
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'dashboard:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    // ─── Check for open cash session ─────────────────────────
    const openSession = await db.cashSession.findFirst({
      where: { restaurantId, status: 'open' },
      include: {
        openedBy: {
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
        supplierPayments: {
          include: {
            user: {
              select: { id: true, username: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    })

    const cashSessionOpen = !!openSession

    // ─── Financial stats from open cash session ──────────────
    let sessionTotalSales = 0
    let sessionTotalCash = 0
    let sessionTotalCard = 0
    let sessionTotalSuppliers = 0
    let sessionOrderCount = 0

    if (openSession) {
      sessionTotalSales = openSession.payments.reduce((sum, p) => sum + p.amount, 0)
      sessionTotalCash = openSession.payments
        .filter((p) => p.method === 'efectivo')
        .reduce((sum, p) => sum + p.amount, 0)
      sessionTotalCard = openSession.payments
        .filter((p) => p.method === 'tarjeta')
        .reduce((sum, p) => sum + p.amount, 0)
      sessionTotalSuppliers = openSession.supplierPayments
        .reduce((sum, sp) => sum + sp.amount, 0)
      sessionOrderCount = openSession.payments.length
    }

    // ─── Non-financial stats (always available) ──────────────

    // Occupied tables count
    const occupiedTables = await db.table.count({
      where: {
        restaurantId,
        status: 'occupied',
        active: true,
      },
    })

    // Total active tables
    const totalActiveTables = await db.table.count({
      where: { restaurantId, active: true },
    })

    // Low stock products (stock <= 5)
    const lowStockProducts = await db.product.findMany({
      where: {
        restaurantId,
        active: true,
        stock: { lte: 5 },
      },
      orderBy: { stock: 'asc' },
      take: 10,
    })

    // Top products (from open session payments only, or from today if no session)
    let topProducts: { productId: string; name: string; totalQuantity: number; totalRevenue: number }[] = []

    if (openSession) {
      const sessionOrderIds = openSession.payments.map((p) => p.orderId)
      if (sessionOrderIds.length > 0) {
        const topProductsRaw = await db.orderItem.groupBy({
          by: ['productId'],
          where: {
            orderId: { in: sessionOrderIds },
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
          take: 5,
        })

        topProducts = await Promise.all(
          topProductsRaw.map(async (item) => {
            const product = await db.product.findUnique({
              where: { id: item.productId },
            })
            return {
              productId: item.productId,
              name: product?.name ?? 'Unknown',
              totalQuantity: item._sum.quantity ?? 0,
              totalRevenue: item._sum.subtotal ?? 0,
            }
          })
        )
      }
    }

    // Recent orders (last 10, active statuses)
    const recentOrders = await db.order.findMany({
      where: {
        restaurantId,
        status: { notIn: ['paid', 'cancelled'] },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        client: true,
        _count: {
          select: { items: true },
        },
      },
    })

    // Orders by status (active orders only)
    const ordersByStatus = await db.order.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: {
        restaurantId,
        status: { notIn: ['paid', 'cancelled'] },
      },
    })

    // Total products and categories
    const totalActiveProducts = await db.product.count({
      where: { restaurantId, active: true },
    })

    const categories = await db.product.groupBy({
      by: ['category'],
      where: { restaurantId, active: true },
      _count: { category: true },
    })

    return Response.json({
      stats: {
        totalOrdersToday: sessionOrderCount,
        revenueToday: Math.round(sessionTotalSales * 100) / 100,
        totalCash: Math.round(sessionTotalCash * 100) / 100,
        totalCard: Math.round(sessionTotalCard * 100) / 100,
        totalSuppliers: Math.round(sessionTotalSuppliers * 100) / 100,
        netTotal: Math.round((sessionTotalSales - sessionTotalSuppliers) * 100) / 100,
        occupiedTables,
        totalActiveTables,
        totalActiveProducts,
        lowStockCount: lowStockProducts.length,
      },
      cashSession: openSession
        ? {
            id: openSession.id,
            openedAt: openSession.openedAt,
            openingCash: openSession.openingCash,
            openedBy: openSession.openedBy,
          }
        : null,
      cashSessionOpen,
      topProducts,
      lowStockProducts,
      recentOrders,
      ordersByStatus: ordersByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      categories: categories.map((cat) => ({
        category: cat.category,
        count: cat._count.category,
      })),
    })
  } catch (error) {
    return handleApiError('Dashboard GET', error)
  }
}
