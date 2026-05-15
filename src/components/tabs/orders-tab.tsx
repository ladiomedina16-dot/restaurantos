'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { Order } from '@/types/restaurant'
import { clientHasPermission } from '@/lib/client-permissions'
import { orderStatusConfig } from '@/lib/constants'
import { formatEUR, formatTime, timeAgo } from '@/lib/formatters'
import { zoneConfig } from '@/lib/config-ui'
import { toast } from 'sonner'
import { Clock, UserCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function OrdersTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'orders:update')

  const fetchOrders = useCallback(async () => {
    try {
      const url = statusFilter ? `/api/orders?status=${statusFilter}` : '/api/orders'
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(url, { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setOrders(json.orders)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, statusFilter, overrideRestaurantId])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Estado actualizado')
        fetchOrders()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar estado')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const statusFilters = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'in_progress', label: 'En preparación' },
    { value: 'ready', label: 'Listos' },
    { value: 'served', label: 'Servidos' },
    { value: 'paid', label: 'Pagados' },
    { value: 'cancelled', label: 'Cancelados' },
  ]

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'pending': return 'in_progress'
      case 'in_progress': return 'ready'
      case 'ready': return 'served'
      case 'served': return 'paid'
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Pedidos</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={fetchOrders}>
            <Clock className="size-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            className={`h-8 shrink-0 text-xs ${statusFilter === filter.value ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
            onClick={() => { setStatusFilter(filter.value); setLoading(true) }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay pedidos
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const cfg = orderStatusConfig[order.status]
            const nextStatus = getNextStatus(order.status)
            return (
              <Card key={order.id} className="rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors" onClick={() => { setSelectedOrder(order); setShowDetailDialog(true) }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold">
                        M{order.table?.number ?? '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cfg?.color ?? ''}>{cfg?.label ?? order.status}</Badge>
                          <span className="text-xs text-muted-foreground">{zoneConfig[order.table?.zone]?.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.items.length} items · {timeAgo(order.createdAt)}
                          {order.status === 'cancelled' && (
                            <> · <span className="text-red-600">Cancelado por: {order.cancelledBy?.name || order.cancelledBy?.username || 'Usuario eliminado'}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatEUR(order.total)}</span>
                      {canUpdate && nextStatus && (
                        <Button
                          size="sm"
                          className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          disabled={updatingStatus === order.id}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, nextStatus) }}
                        >
                          {updatingStatus === order.id ? '...' : orderStatusConfig[nextStatus]?.label ?? nextStatus}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Pedido — Mesa {selectedOrder?.table?.number ?? '?'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <span>
                  {zoneConfig[selectedOrder.table?.zone]?.label} · {formatTime(selectedOrder.createdAt)} ·{' '}
                  <Badge variant="outline" className={orderStatusConfig[selectedOrder.status]?.color ?? ''}>
                    {orderStatusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                  </Badge>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Items */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Productos</Label>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded bg-amber-100 text-amber-800 text-xs font-bold">{item.quantity}</span>
                      <span>{item.product?.name ?? 'Producto'}</span>
                      {item.notes && <span className="text-xs text-muted-foreground">({item.notes})</span>}
                    </div>
                    <span className="font-semibold">{formatEUR(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatEUR(selectedOrder.total)}</span>
              </div>

              {/* Client info */}
              {selectedOrder.client && (
                <div className="text-sm text-muted-foreground">
                  <UserCircle className="size-4 inline mr-1" />
                  {selectedOrder.client.name} {selectedOrder.client.phone && `· ${selectedOrder.client.phone}`}
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notas: </span>
                  {selectedOrder.notes}
                </div>
              )}

              {/* Cancelled by */}
              {selectedOrder.status === 'cancelled' && (
                <div className="text-sm bg-red-50 rounded-lg p-3">
                  <span className="text-red-600 font-medium">Cancelado por: {selectedOrder.cancelledBy?.name || selectedOrder.cancelledBy?.username || 'Usuario eliminado'}</span>
                  {selectedOrder.cancelledAt && (
                    <span className="text-red-500 text-xs ml-2">({new Date(selectedOrder.cancelledAt).toLocaleString('es-ES')})</span>
                  )}
                </div>
              )}

              {/* Status change buttons */}
              {canUpdate && selectedOrder.status !== 'paid' && selectedOrder.status !== 'cancelled' && (
                <div className="flex gap-2 flex-wrap">
                  {getNextStatus(selectedOrder.status) && (
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => {
                        const next = getNextStatus(selectedOrder.status)
                        if (next) handleStatusChange(selectedOrder.id, next)
                        setShowDetailDialog(false)
                      }}
                    >
                      Marcar como {orderStatusConfig[getNextStatus(selectedOrder.status)!]?.label}
                    </Button>
                  )}
                  {selectedOrder.status !== 'cancelled' && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleStatusChange(selectedOrder.id, 'cancelled')
                        setShowDetailDialog(false)
                      }}
                    >
                      Cancelar pedido
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
