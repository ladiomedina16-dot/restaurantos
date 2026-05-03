import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get today's date range
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    // Total orders today
    const totalOrdersToday = await db.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    })

    // Revenue today (sum of totals for paid/completed orders)
    const todayOrders = await db.order.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: { notIn: ['cancelled'] },
      },
      select: { total: true },
    })

    const revenueToday = todayOrders.reduce((sum, order) => sum + order.total, 0)

    // Occupied tables count
    const occupiedTables = await db.table.count({
      where: {
        status: 'occupied',
        active: true,
      },
    })

    // Total active tables
    const totalActiveTables = await db.table.count({
      where: { active: true },
    })

    // Low stock products (stock <= 5)
    const lowStockProducts = await db.product.findMany({
      where: {
        active: true,
        stock: { lte: 5 },
      },
      orderBy: { stock: 'asc' },
      take: 10,
    })

    // Top products (by quantity sold today)
    const topProducts = await db.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: { notIn: ['cancelled'] },
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
      take: 5,
    })

    // Enrich top products with product details
    const enrichedTopProducts = await Promise.all(
      topProducts.map(async (item) => {
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

    // Recent orders
    const recentOrders = await db.order.findMany({
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

    // Orders by status
    const ordersByStatus = await db.order.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: {
        status: { notIn: ['paid', 'cancelled'] },
      },
    })

    // Total products and categories
    const totalActiveProducts = await db.product.count({
      where: { active: true },
    })

    const categories = await db.product.groupBy({
      by: ['category'],
      where: { active: true },
      _count: { category: true },
    })

    return NextResponse.json({
      stats: {
        totalOrdersToday,
        revenueToday: Math.round(revenueToday * 100) / 100,
        occupiedTables,
        totalActiveTables,
        totalActiveProducts,
        lowStockCount: lowStockProducts.length,
      },
      topProducts: enrichedTopProducts,
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
    console.error('Dashboard GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
