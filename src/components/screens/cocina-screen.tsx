'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingCart,
  ChefHat,
  CheckCircle,
  CheckCheck,
  Timer,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/common/auth-context'
import { clientHasPermission } from '@/lib/client-permissions'
import { handlePrintTicket, printJob } from '@/lib/print-client'
import { formatTime, timeAgo, elapsedColor } from '@/lib/formatters'
import { zoneConfig } from '@/lib/config-ui'
import type { Order } from '@/types/restaurant'
import { toast } from 'sonner'

// ─── COCINA TAB ─────────────────────────────────────────────────────────────

export function CocinaTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [markingItem, setMarkingItem] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()

  const fetchOrders = useCallback(async () => {
    try {
      // destination=kitchen filters to kitchen items — show pending + in_progress orders
      const url = '/api/orders?status=pending,in_progress&destination=kitchen'
      console.log('[Cocina] Fetching:', url)
      console.log('[Cocina] Auth headers:', { hasToken: !!authHeaders(false)['Authorization'], restaurantId: authHeaders(false)['X-Restaurant-Id'] ?? 'MISSING' })
      const res = await fetch(url, { headers: authHeaders(false) })
      console.log('[Cocina] API response status:', res.status, res.statusText)
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        console.log('[Cocina] API returned:', json.orders?.length, 'orders')
        // Log each order and its items
        ;(json.orders as Order[]).forEach((order: Order) => {
          console.log(`[Cocina]   Order ${order.id}: status=${order.status}, table=${order.table?.number}, items=${order.items.length}`, 
            order.items.map((i) => ({ name: i.product?.name, dest: i.destination, status: i.status })))
        })
        // Filter out orders where ALL kitchen items are already ready (backend already filters, but double-check)
        const filtered = (json.orders as Order[]).filter((order) => {
          const kitchenItems = order.items.filter((i) => i.destination === 'kitchen')
          const hasPending = kitchenItems.some((i) => i.status !== 'ready')
          console.log(`[Cocina]   Order ${order.id}: kitchenItems=${kitchenItems.length}, hasPending=${hasPending}`)
          return hasPending
        })
        console.log('[Cocina] Final filtered:', filtered.length, 'orders')
        setOrders(filtered)
      } else {
        const errText = await res.text().catch(() => '')
        console.error('[Cocina] Fetch failed:', res.status, errText)
        if (res.status === 403) {
          toast.error('Sin permiso para ver pedidos. Contacte al administrador.')
        } else if (res.status !== 401) {
          toast.error(`Error al cargar pedidos (${res.status})`)
        }
      }
    } catch (err) {
      console.error('[Cocina] Fetch error:', err)
      toast.error('Error de red al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // ─── Auto-print: poll pending kitchen print jobs ────────────
  // NOTE: La selección de impresora depende del navegador/sistema operativo.
  // Para impresión silenciosa se requiere QZ Tray, app local o Capacitor.
  useEffect(() => {
    if (!clientHasPermission(currentUser?.role ?? '', 'print:read')) return

    const pollPrintJobs = async () => {
      try {
        const res = await fetch('/api/print/jobs?destination=kitchen', {
          headers: authHeaders(false),
        })
        if (res.ok) {
          const { jobs } = await res.json()
          for (const job of jobs) {
            await printJob(job, authHeaders, 'kitchen')
          }
        }
      } catch {
        // Silently fail — don't disrupt cocina workflow
      }
    }

    // Poll every 4 seconds
    const interval = setInterval(pollPrintJobs, 4000)
    // Initial poll after a short delay to avoid race with auth
    const timeout = setTimeout(pollPrintJobs, 2000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [authHeaders, currentUser])

  // Update time display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  // Per-item ready: mark a single kitchen item as ready
  const handleItemReady = async (orderId: string, itemId: string) => {
    setMarkingItem(itemId)
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'ready' }),
      })

      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        const orderStatus = json.orderStatus as string

        // If order was cancelled while we were working on it
        if (orderStatus === 'cancelled') {
          toast.info(`Mesa ${orders.find((o) => o.id === orderId)?.table?.number ?? '?'} — Pedido cancelado`)
          setOrders((prev) => prev.filter((o) => o.id !== orderId))
          return
        }

        // Update local state: mark the item as ready
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o
            const newItems = o.items.map((i) =>
              i.id === itemId ? { ...i, status: 'ready' } : i
            )
            return { ...o, items: newItems, status: orderStatus }
          })
        )

        // Check if ALL kitchen items for this order are now ready
        const order = orders.find((o) => o.id === orderId)
        if (order) {
          const kitchenItems = order.items.filter((i) => i.destination === 'kitchen')
          const remainingPending = kitchenItems.filter(
            (i) => i.id !== itemId && i.status !== 'ready'
          )
          if (remainingPending.length === 0) {
            // All kitchen items ready — remove from view and toast
            toast.success(`Mesa ${order.table?.number ?? '?'} — ¡Comida lista!`)
            setOrders((prev) => prev.filter((o) => o.id !== orderId))
          }
        }
      } else {
        let errorMsg = 'Error al actualizar item'
        try {
          const err = await res.json()
          errorMsg = err.error || errorMsg
        } catch { /* response not JSON */ }
        toast.error(errorMsg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      toast.error(msg)
    } finally {
      setMarkingItem(null)
    }
  }

  // Sort orders: pending first, then in_progress, then by creation time
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <ChefHat className="size-8 animate-pulse" />
          <span className="text-xl">Cargando pedidos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-3 sm:p-4 min-h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <ChefHat className="size-6 sm:size-8 text-amber-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-white">Cocina</h2>
          <Badge className="bg-amber-600 text-white text-xs sm:text-sm">{orders.length} pedidos</Badge>
        </div>
        <Button
          variant="outline"
          className="h-10 border-gray-600 text-gray-300 hover:bg-gray-800"
          onClick={fetchOrders}
        >
          <ShoppingCart className="size-4 mr-1" />
          Actualizar
        </Button>
      </div>

      {/* Orders grid */}
      {sortedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <CheckCheck className="size-16 mb-4" />
          <p className="text-xl font-medium">¡Todo listo!</p>
          <p className="text-sm mt-1">No hay comandas pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {sortedOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-gray-800 rounded-xl p-3 sm:p-4 border-l-4 transition-all ${
                order.status === 'pending' ? 'border-l-amber-500' : 'border-l-orange-500'
              }`}
            >
              {/* Card header: Mesa + Time — NO PRICES */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">Mesa {order.table?.number ?? '?'}</p>
                  <p className="text-xs sm:text-sm text-gray-400">{zoneConfig[order.table?.zone]?.label ?? order.table?.zone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-gray-400">{formatTime(order.createdAt)}</p>
                  <p className={`text-base sm:text-lg font-bold ${elapsedColor(order.createdAt)}`}>
                    <Timer className="size-3 sm:size-4 inline mr-1" />
                    {timeAgo(order.createdAt)}
                  </p>
                </div>
              </div>

              {/* Simple status: pending or preparing — NO payment/served states */}
              <Badge
                className={`mb-2 sm:mb-3 ${
                  order.status === 'pending'
                    ? 'bg-amber-600/20 text-amber-400 border-amber-600/30'
                    : 'bg-orange-600/20 text-orange-400 border-orange-600/30'
                }`}
                variant="outline"
              >
                {order.status === 'pending' ? '⏳ Pendiente' : '🔥 Preparando'}
              </Badge>

              {/* Items list — per-item LISTO buttons, NO PRICES shown. Filter by destination as safety measure */}
              <div className="space-y-1.5 sm:space-y-2">
                {order.items.filter((item) => item.destination === 'kitchen').map((item) => {
                  const isReady = item.status === 'ready'
                  return (
                    <div key={item.id} className="flex items-center gap-1.5 sm:gap-2">
                      <span className={`flex size-5 sm:size-6 items-center justify-center rounded text-xs font-bold shrink-0 ${isReady ? 'bg-green-600/30 text-green-300' : 'bg-amber-600/30 text-amber-300'}`}>
                        {isReady ? <CheckCircle className="size-3 sm:size-4" /> : item.quantity}
                      </span>
                      <span className={`text-xs sm:text-sm leading-tight flex-1 ${isReady ? 'line-through text-gray-500' : 'text-white'}`}>
                        {item.product?.name ?? 'Producto'}
                      </span>
                      {item.notes && (
                        <span className={`text-xs ml-1 hidden sm:inline ${isReady ? 'text-gray-600' : 'text-amber-400'}`}>({item.notes})</span>
                      )}
                      {item.modifiers && item.modifiers !== '[]' && item.modifiers !== '' && (
                        <span className={`text-xs ml-1 hidden sm:inline ${isReady ? 'text-gray-600' : 'text-red-400'}`}>
                          ({JSON.parse(item.modifiers).join(', ')})
                        </span>
                      )}
                      {isReady ? (
                        <CheckCircle className="size-4 sm:size-5 text-green-400 shrink-0" />
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shrink-0"
                          onClick={() => handleItemReady(order.id, item.id)}
                          disabled={markingItem === item.id}
                        >
                          {markingItem === item.id ? '...' : 'LISTO'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Print kitchen ticket */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={() => handlePrintTicket('kitchen', order.id, authHeaders)}
              >
                <Printer className="size-3.5 mr-1" />
                Imprimir cocina
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
