'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { Order } from '@/types/restaurant'
import { clientHasPermission } from '@/lib/client-permissions'
import { orderStatusConfig } from '@/lib/constants'
import { formatEUR, formatTime, timeAgo } from '@/lib/formatters'
import { zoneConfig } from '@/lib/config-ui'
import { handlePrintTicket } from '@/lib/print-client'
import { toast } from 'sonner'
import {
  Clock,
  UserCircle,
  Search,
  Receipt,
  Printer,
  FileText,
  CreditCard,
  Banknote,
  Users,
  MapPin,
  X,
  Calendar,
  CalendarX,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

// ─── Ticket Number Helper ─────────────────────────────────────
// Uses last 6 chars of order ID as visual ticket number
// (temporary until fiscal invoice table is created)
function ticketNumber(orderId: string): string {
  return '#' + orderId.slice(-6).toUpperCase()
}

// ─── Date Grouping Helper ─────────────────────────────────────
function dateGroupLabel(date: Date): { key: string; label: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return { key: 'today', label: 'Hoy' }
  if (d.getTime() === yesterday.getTime()) return { key: 'yesterday', label: 'Ayer' }

  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return { key: `${yyyy}-${mm}-${dd}`, label: `${dd}/${mm}/${yyyy}` }
}

function groupOrdersByDate(orders: Order[]) {
  const groups: { key: string; label: string; orders: Order[] }[] = []
  const groupMap = new Map<string, { key: string; label: string; orders: Order[] }>()

  for (const order of orders) {
    // Use updatedAt for paid orders (that's when payment was processed)
    const date = order.status === 'paid' ? new Date(order.updatedAt) : new Date(order.createdAt)
    const { key, label } = dateGroupLabel(date)

    let group = groupMap.get(key)
    if (!group) {
      group = { key, label, orders: [] }
      groupMap.set(key, group)
      groups.push(group)
    }
    group.orders.push(order)
  }

  return groups
}

// ─── Payment Method Badge ─────────────────────────────────────
function PaymentMethodBadge({ method }: { method: string }) {
  if (method === 'efectivo') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0">
        <Banknote className="size-2.5 mr-0.5" />Efectivo
      </Badge>
    )
  }
  if (method === 'tarjeta') {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0">
        <CreditCard className="size-2.5 mr-0.5" />Tarjeta
      </Badge>
    )
  }
  if (method === 'mixto') {
    return (
      <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[10px] px-1.5 py-0">
        Mixto
      </Badge>
    )
  }
  return <Badge variant="outline" className="text-[10px]">{method}</Badge>
}

// ─── Orders Tab ───────────────────────────────────────────────

export function OrdersTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [reprinting, setReprinting] = useState<string | null>(null)

  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'orders:update')
  const canPrint = currentUser && clientHasPermission(currentUser.role, 'print:read')

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

  const handleReprint = async (e: React.MouseEvent, order: Order, docType: 'ticket' | 'factura') => {
    e.stopPropagation()
    setReprinting(order.id)
    try {
      await handlePrintTicket('receipt', order.id, authHeaders, docType)
    } finally {
      setReprinting(null)
    }
  }

  const statusFilters = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'in_progress', label: 'En preparación' },
    { value: 'ready', label: 'Listos' },
    { value: 'served', label: 'Servidos' },
    { value: 'bill_requested', label: 'Cuenta pedida' },
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

  // ─── Search & date filtering for paid orders ────────────────────
  const isPaidView = statusFilter === 'paid'

  // Helper: format a date string "YYYY-MM-DD" as "DD/MM/YYYY"
  function formatDateFilterLabel(dateStr: string): string {
    const [yyyy, mm, dd] = dateStr.split('-')
    return `${dd}/${mm}/${yyyy}`
  }

  const filteredOrders = useMemo(() => {
    if (!isPaidView) return orders
    let result = orders

    // Date filter
    if (dateFilter) {
      result = result.filter((order) => {
        const orderDate = new Date(order.updatedAt)
        const y = orderDate.getFullYear()
        const m = String(orderDate.getMonth() + 1).padStart(2, '0')
        const d = String(orderDate.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}` === dateFilter
      })
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((order) => {
        const ticket = ticketNumber(order.id).toLowerCase()
        const mesa = `m${order.table?.number ?? ''}`
        const total = formatEUR(order.total).toLowerCase()
        const date = new Date(order.updatedAt).toLocaleDateString('es-ES').toLowerCase()
        const time = new Date(order.updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }).toLowerCase()
        const zone = zoneConfig[order.table?.zone]?.label?.toLowerCase() ?? ''
        const cashier = order.payments?.[0]?.user?.name?.toLowerCase() ?? order.payments?.[0]?.user?.username?.toLowerCase() ?? ''
        return (
          ticket.includes(q) ||
          mesa.includes(q) ||
          total.includes(q) ||
          date.includes(q) ||
          time.includes(q) ||
          zone.includes(q) ||
          cashier.includes(q)
        )
      })
    }

    return result
  }, [orders, isPaidView, searchQuery, dateFilter])

  const groupedOrders = useMemo(() => {
    if (!isPaidView) return null
    // When a specific date is selected, skip grouping — show flat list under one header
    if (dateFilter) return null
    return groupOrdersByDate(filteredOrders)
  }, [filteredOrders, isPaidView, dateFilter])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  // ─── PAID ORDERS VIEW (grouped, searchable, reprintable) ─────
  if (isPaidView) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Pedidos Pagados</h2>
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
              onClick={() => { setStatusFilter(filter.value); setLoading(true); setSearchQuery(''); setDateFilter('') }}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Search bar + Date filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por Ticket #, mesa, total, fecha, cajero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 pr-9"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-11 pl-9 pr-3 w-[180px]"
              />
            </div>
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-11 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setDateFilter('')}
                title="Limpiar fecha"
              >
                <CalendarX className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt className="size-4" />
          {dateFilter ? (
            <span>{filteredOrders.length} ticket{filteredOrders.length !== 1 ? 's' : ''} encontrado{filteredOrders.length !== 1 ? 's' : ''} para {formatDateFilterLabel(dateFilter)}</span>
          ) : (
            <span>{filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} pagado{filteredOrders.length !== 1 ? 's' : ''}</span>
          )}
          {searchQuery && <span className="text-amber-600">— filtrando por &quot;{searchQuery}&quot;</span>}
        </div>

        {/* Orders list */}
        {filteredOrders.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Receipt className="size-12 mx-auto mb-3 opacity-30" />
              {dateFilter ? (
                <p>No hay tickets pagados para {formatDateFilterLabel(dateFilter)}</p>
              ) : (
                <p>No hay pedidos pagados</p>
              )}
              {searchQuery && <p className="text-xs mt-1">Prueba con otro término de búsqueda</p>}
            </CardContent>
          </Card>
        ) : dateFilter ? (
          /* Single-date view: header + flat grid */
          <div>
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background z-10 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Tickets del {formatDateFilterLabel(dateFilter)}
              </span>
              <Badge variant="outline" className="text-[10px]">{filteredOrders.length}</Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredOrders.map((order) => {
                const payment = order.payments?.[0]
                const paymentMethods = order.payments?.map((p) => p.method) ?? []
                const uniqueMethods = [...new Set(paymentMethods)]
                const cashier = payment?.user?.name || payment?.user?.username

                return (
                  <Card
                    key={order.id}
                    className="rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors border-l-4 border-l-emerald-400"
                    onClick={() => { setSelectedOrder(order); setShowDetailDialog(true) }}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Header: Ticket # + Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="size-3.5 text-emerald-600" />
                          <span className="font-mono font-bold text-sm text-emerald-700">
                            Ticket {ticketNumber(order.id)}
                          </span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0">
                          Pagado
                        </Badge>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3" />
                          <span>Mesa {order.table?.number ?? '?'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="size-3" />
                          <span>{zoneConfig[order.table?.zone]?.label ?? order.table?.zone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="size-3" />
                          <span>{formatTime(order.updatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Payment methods + cashier */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1 flex-wrap">
                          {uniqueMethods.map((m) => (
                            <PaymentMethodBadge key={m} method={m} />
                          ))}
                        </div>
                        {cashier && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={`Cajero: ${cashier}`}>
                            {cashier}
                          </span>
                        )}
                      </div>

                      {/* Total */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="font-bold text-emerald-700">{formatEUR(order.total)}</span>
                      </div>

                      {/* Reprint buttons */}
                      {canPrint && (
                        <div className="flex gap-1.5 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] flex-1"
                            disabled={reprinting === order.id}
                            onClick={(e) => handleReprint(e, order, 'ticket')}
                          >
                            <Printer className="size-3 mr-1" />
                            {reprinting === order.id ? '...' : 'Reimprimir'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] flex-1"
                            disabled={reprinting === order.id}
                            onClick={(e) => handleReprint(e, order, 'factura')}
                          >
                            <FileText className="size-3 mr-1" />
                            Factura
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          /* No date filter: grouped by date (Hoy / Ayer / DD/MM/YYYY) */
          groupedOrders?.map((group) => (
            <div key={group.key}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background z-10 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-3">
                  {group.label}
                </span>
                <Badge variant="outline" className="text-[10px]">{group.orders.length}</Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.orders.map((order) => {
                  const payment = order.payments?.[0]
                  const paymentMethods = order.payments?.map((p) => p.method) ?? []
                  const uniqueMethods = [...new Set(paymentMethods)]
                  const cashier = payment?.user?.name || payment?.user?.username

                  return (
                    <Card
                      key={order.id}
                      className="rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors border-l-4 border-l-emerald-400"
                      onClick={() => { setSelectedOrder(order); setShowDetailDialog(true) }}
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Header: Ticket # + Badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Receipt className="size-3.5 text-emerald-600" />
                            <span className="font-mono font-bold text-sm text-emerald-700">
                              Ticket {ticketNumber(order.id)}
                            </span>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0">
                            Pagado
                          </Badge>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="size-3" />
                            <span>Mesa {order.table?.number ?? '?'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="size-3" />
                            <span>{zoneConfig[order.table?.zone]?.label ?? order.table?.zone}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="size-3" />
                            <span>{formatTime(order.updatedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Payment methods + cashier */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1 flex-wrap">
                            {uniqueMethods.map((m) => (
                              <PaymentMethodBadge key={m} method={m} />
                            ))}
                          </div>
                          {cashier && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={`Cajero: ${cashier}`}>
                              {cashier}
                            </span>
                          )}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between pt-1 border-t">
                          <span className="text-xs text-muted-foreground">Total</span>
                          <span className="font-bold text-emerald-700">{formatEUR(order.total)}</span>
                        </div>

                        {/* Reprint buttons */}
                        {canPrint && (
                          <div className="flex gap-1.5 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] flex-1"
                              disabled={reprinting === order.id}
                              onClick={(e) => handleReprint(e, order, 'ticket')}
                            >
                              <Printer className="size-3 mr-1" />
                              {reprinting === order.id ? '...' : 'Reimprimir'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] flex-1"
                              disabled={reprinting === order.id}
                              onClick={(e) => handleReprint(e, order, 'factura')}
                            >
                              <FileText className="size-3 mr-1" />
                              Factura
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Order Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Ticket {selectedOrder ? ticketNumber(selectedOrder.id) : ''} — Mesa {selectedOrder?.table?.number ?? '?'}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder && (
                  <span>
                    {zoneConfig[selectedOrder.table?.zone]?.label} · {formatTime(selectedOrder.updatedAt)} ·{' '}
                    <Badge variant="outline" className={orderStatusConfig[selectedOrder.status]?.color ?? ''}>
                      {orderStatusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                    </Badge>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Payment info for paid orders */}
                {selectedOrder.status === 'paid' && selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <div className="bg-emerald-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <Receipt className="size-4" />
                      Detalle del pago
                    </div>
                    {selectedOrder.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <PaymentMethodBadge method={p.method} />
                          <span className="text-muted-foreground">
                            {p.user?.name || p.user?.username || 'Usuario eliminado'}
                          </span>
                        </div>
                        <span className="font-semibold">{formatEUR(p.amount)}</span>
                      </div>
                    ))}
                    {(selectedOrder.discount ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs text-emerald-600">
                        <span>Descuento 5ª gratis</span>
                        <span>-{formatEUR(selectedOrder.discount ?? 0)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>Total cobrado</span>
                      <span className="text-emerald-700">{formatEUR(selectedOrder.total)}</span>
                    </div>
                  </div>
                )}

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
                <div className="space-y-1">
                  {selectedOrder.subtotal !== undefined && selectedOrder.subtotal !== selectedOrder.total && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatEUR(selectedOrder.subtotal)}</span>
                    </div>
                  )}
                  {(selectedOrder.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Descuento</span>
                      <span>-{formatEUR(selectedOrder.discount ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatEUR(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Client info */}
                {selectedOrder.client && (
                  <div className="text-sm text-muted-foreground">
                    <UserCircle className="size-4 inline mr-1" />
                    {selectedOrder.client.name} {selectedOrder.client.phone && `· ${selectedOrder.client.phone}`}
                  </div>
                )}

                {/* Reprint buttons for paid orders */}
                {selectedOrder.status === 'paid' && canPrint && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={reprinting === selectedOrder.id}
                      onClick={() => handleReprint({ stopPropagation: () => {} } as React.MouseEvent, selectedOrder, 'ticket')}
                    >
                      <Printer className="size-4 mr-2" />
                      Reimprimir Ticket
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={reprinting === selectedOrder.id}
                      onClick={() => handleReprint({ stopPropagation: () => {} } as React.MouseEvent, selectedOrder, 'factura')}
                    >
                      <FileText className="size-4 mr-2" />
                      Factura
                    </Button>
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

                {/* Status change buttons (only for non-paid, non-cancelled) */}
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

  // ─── DEFAULT ORDERS VIEW (non-paid statuses) ─────────────────
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
            onClick={() => { setStatusFilter(filter.value); setLoading(true); setDateFilter(''); setSearchQuery('') }}
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
