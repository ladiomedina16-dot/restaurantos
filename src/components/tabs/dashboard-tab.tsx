'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { DashboardData } from '@/types/restaurant'
import { formatEUR, timeAgo } from '@/lib/formatters'
import { orderStatusConfig } from '@/lib/constants'
import { toast } from 'sonner'
import {
  Clock,
  Lock,
  CheckCircle,
  Receipt,
  Euro,
  CreditCard,
  ShoppingCart,
  BarChart3,
  Utensils,
  Package,
  AlertTriangle,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    try {
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/dashboard', { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, overrideRestaurantId])

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-6 text-center text-muted-foreground">
          No se pudieron cargar los datos del dashboard
        </CardContent>
      </Card>
    )
  }

  const { stats, topProducts, lowStockProducts, recentOrders, ordersByStatus, cashSessionOpen, cashSession } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <Button variant="outline" size="sm" className="h-9" onClick={fetchDashboard}>
          <Clock className="size-4 mr-1" />
          Actualizar
        </Button>
      </div>

      {/* Cash Session Banner */}
      {!cashSessionOpen && (
        <Card className="rounded-xl border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-200">
              <Lock className="size-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">No hay caja abierta</p>
              <p className="text-sm text-amber-700">Abre una sesión de caja para ver las ventas activas. Los datos históricos están en Reportes.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {cashSessionOpen && cashSession && (
        <Card className="rounded-xl border-green-300 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-200">
              <CheckCircle className="size-5 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-900">Caja abierta</p>
              <p className="text-sm text-green-700">
                Abierta por {cashSession.openedBy?.name || cashSession.openedBy?.username || 'Usuario eliminado'} · {timeAgo(cashSession.openedAt)} · Fondo: {formatEUR(cashSession.openingCash)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Stats Cards - from cash session */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Receipt className="size-4" />
              <span className="text-xs font-medium">Cobros sesión</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalOrdersToday}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Euro className="size-4" />
              <span className="text-xs font-medium">Ventas sesión</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{cashSessionOpen ? formatEUR(stats.revenueToday) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Euro className="size-4" />
              <span className="text-xs font-medium">Efectivo</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{cashSessionOpen ? formatEUR(stats.totalCash) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="size-4" />
              <span className="text-xs font-medium">Tarjeta</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{cashSessionOpen ? formatEUR(stats.totalCard) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="size-4" />
              <span className="text-xs font-medium">Proveedores</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{cashSessionOpen ? formatEUR(stats.totalSuppliers) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="size-4" />
              <span className="text-xs font-medium">Neto sesión</span>
            </div>
            <p className="text-2xl font-bold">{cashSessionOpen ? formatEUR(stats.netTotal) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Operational stats (always visible) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Utensils className="size-4" />
              <span className="text-xs font-medium">Mesas ocupadas</span>
            </div>
            <p className="text-2xl font-bold">{stats.occupiedTables}<span className="text-sm text-muted-foreground font-normal">/{stats.totalActiveTables}</span></p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="size-4" />
              <span className="text-xs font-medium">Productos activos</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalActiveProducts}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertTriangle className="size-4" />
              <span className="text-xs font-medium">Stock bajo</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats.lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="size-4" />
              <span className="text-xs font-medium">Ocupación</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalActiveTables > 0 ? Math.round((stats.occupiedTables / stats.totalActiveTables) * 100) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders by Status */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pedidos por estado</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {ordersByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay pedidos activos</p>
            ) : (
              <div className="space-y-2">
                {ordersByStatus.map((item) => {
                  const cfg = orderStatusConfig[item.status]
                  return (
                    <div key={item.status} className="flex items-center justify-between">
                      <Badge variant="outline" className={cfg?.color ?? 'bg-gray-100 text-gray-800'}>{cfg?.label ?? item.status}</Badge>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{cashSessionOpen ? 'Top productos sesión' : 'Top productos'}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{cashSessionOpen ? 'Sin ventas en esta sesión' : 'Sin datos — abre caja para ver ventas'}</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((product, idx) => (
                  <div key={product.productId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold">{idx + 1}</span>
                      <span className="text-sm font-medium">{product.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{product.totalQuantity}u</span>
                      <span className="text-xs text-muted-foreground ml-2">{formatEUR(product.totalRevenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Products */}
        {lowStockProducts.length > 0 && (
          <Card className="rounded-xl border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                Productos con stock bajo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{product.name}</span>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{product.stock} uds</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pedidos activos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay pedidos activos</p>
              ) : (
                recentOrders.map((order) => {
                  const cfg = orderStatusConfig[order.status]
                  return (
                    <div key={order.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">M{order.table?.number ?? '?'}</span>
                        <Badge variant="outline" className={`text-xs ${cfg?.color ?? ''}`}>{cfg?.label ?? order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatEUR(order.total)}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
