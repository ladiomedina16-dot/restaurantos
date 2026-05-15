'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingCart,
  Beer,
  CheckCircle,
  CheckCheck,
  Timer,
  Printer,
  Wine,
  UserCircle,
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

// ─── BARRA TAB (Bar drinks) ──────────────────────────────────────────────────

export function BarraTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [markingItem, setMarkingItem] = useState<string | null>(null)
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()

  const fetchOrders = useCallback(async () => {
    try {
      const url = '/api/orders?status=pending,in_progress&destination=bar'
      console.log('[Barra] Fetching:', url)
      console.log('[Barra] Auth headers:', { hasToken: !!authHeaders(false)['Authorization'], restaurantId: authHeaders(false)['X-Restaurant-Id'] ?? 'MISSING' })
      const res = await fetch(url, { headers: authHeaders(false) })
      console.log('[Barra] API response status:', res.status, res.statusText)
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        console.log('[Barra] API returned:', json.orders?.length, 'orders')
        // Log each order and its items
        ;(json.orders as Order[]).forEach((order: Order) => {
          console.log(`[Barra]   Order ${order.id}: status=${order.status}, table=${order.table?.number}, items=${order.items.length}`, 
            order.items.map((i) => ({ name: i.product?.name, dest: i.destination, status: i.status })))
        })
        // Filter out orders where ALL bar items are already ready (backend already filters, but double-check)
        const filtered = (json.orders as Order[]).filter((order) => {
          const barItems = order.items.filter((i) => i.destination === 'bar')
          const hasPending = barItems.some((i) => i.status !== 'ready')
          console.log(`[Barra]   Order ${order.id}: barItems=${barItems.length}, hasPending=${hasPending}`)
          return hasPending
        })
        console.log('[Barra] Final filtered:', filtered.length, 'orders')
        setOrders(filtered)
      } else {
        const errText = await res.text().catch(() => '')
        console.error('[Barra] Fetch failed:', res.status, errText)
        if (res.status === 403) {
          toast.error('Sin permiso para ver pedidos. Contacte al administrador.')
        } else if (res.status !== 401) {
          toast.error(`Error al cargar pedidos (${res.status})`)
        }
      }
    } catch (err) {
      console.error('[Barra] Fetch error:', err)
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

  // ─── Auto-print: poll pending bar print jobs ────────────────
  // NOTE: La selección de impresora depende del navegador/sistema operativo.
  // Para impresión silenciosa se requiere QZ Tray, app local o Capacitor.
  useEffect(() => {
    if (!clientHasPermission(currentUser?.role ?? '', 'print:read')) return

    const pollPrintJobs = async () => {
      try {
        const res = await fetch('/api/print/jobs?destination=bar', {
          headers: authHeaders(false),
        })
        if (res.ok) {
          const { jobs } = await res.json()
          for (const job of jobs) {
            await printJob(job, authHeaders, 'bar')
          }
        }
      } catch {
        // Silently fail — don't disrupt barra workflow
      }
    }

    // Poll every 4 seconds
    const interval = setInterval(pollPrintJobs, 4000)
    // Initial poll after a short delay to avoid race with auth
    const timeout = setTimeout(pollPrintJobs, 2000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [authHeaders, currentUser])

  // Per-item ready: mark a single bar item as ready
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

        // Check if ALL bar items for this order are now ready
        const order = orders.find((o) => o.id === orderId)
        if (order) {
          const barItems = order.items.filter((i) => i.destination === 'bar')
          const remainingPending = barItems.filter(
            (i) => i.id !== itemId && i.status !== 'ready'
          )
          if (remainingPending.length === 0) {
            // All bar items ready — remove from view and toast
            toast.success(`Mesa ${order.table?.number ?? '?'} — ¡Bebidas listas!`)
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

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  if (loading) {
    return (
      <div className="bg-amber-50 rounded-xl p-6 min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <Beer className="size-8 animate-pulse" />
          <span className="text-xl">Cargando bebidas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 rounded-xl p-3 sm:p-4 min-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Wine className="size-6 sm:size-8 text-amber-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-amber-900">Barra</h2>
          <Badge className="bg-amber-600 text-white text-xs sm:text-sm">{orders.length} pedidos</Badge>
        </div>
        <Button variant="outline" size="sm" className="h-9 sm:h-10" onClick={fetchOrders}>
          <ShoppingCart className="size-4 mr-1" />
          Actualizar
        </Button>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-amber-400">
          <CheckCheck className="size-16 mb-4" />
          <p className="text-xl font-medium">¡Todo listo!</p>
          <p className="text-sm mt-1">No hay bebidas pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {sortedOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-xl p-3 sm:p-4 border-l-4 transition-all shadow-sm ${
                order.status === 'pending' ? 'border-l-amber-500' : 'border-l-orange-500'
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-900">Mesa {order.table?.number ?? '?'}</p>
                  <p className="text-xs sm:text-sm text-amber-600">{zoneConfig[order.table?.zone]?.label ?? order.table?.zone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-amber-600">{formatTime(order.createdAt)}</p>
                  <p className={`text-base sm:text-lg font-bold ${elapsedColor(order.createdAt)}`}>
                    <Timer className="size-3 sm:size-4 inline mr-1" />
                    {timeAgo(order.createdAt)}
                  </p>
                </div>
              </div>

              <Badge
                className={`mb-2 sm:mb-3 ${
                  order.status === 'pending'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-orange-100 text-orange-800 border-orange-200'
                }`}
                variant="outline"
              >
                {order.status === 'pending' ? '⏳ Pendiente' : '🔥 Preparando'}
              </Badge>

              {/* Items list — filter by destination as safety measure */}
              <div className="space-y-1.5 sm:space-y-2">
                {order.items.filter((item) => item.destination === 'bar').map((item) => {
                  const isReady = item.status === 'ready'
                  return (
                    <div key={item.id} className="flex items-center gap-1.5 sm:gap-2">
                      <span className={`flex size-5 sm:size-6 items-center justify-center rounded text-xs font-bold shrink-0 ${isReady ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                        {isReady ? <CheckCircle className="size-3 sm:size-4" /> : item.quantity}
                      </span>
                      <span className={`text-xs sm:text-sm leading-tight flex-1 ${isReady ? 'line-through text-amber-400' : 'text-amber-900'}`}>
                        {item.product?.name ?? 'Bebida'}
                      </span>
                      {item.notes && (
                        <span className={`text-xs ml-1 hidden sm:inline ${isReady ? 'text-amber-300' : 'text-amber-500'}`}>({item.notes})</span>
                      )}
                      {isReady ? (
                        <CheckCircle className="size-4 sm:size-5 text-green-600 shrink-0" />
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
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

              {order.client && (
                <p className="text-xs text-amber-500 mb-3">
                  <UserCircle className="size-3 inline mr-1" />
                  {order.client.name}
                </p>
              )}

              {/* Print bar ticket */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-xs text-amber-500 hover:text-amber-900 hover:bg-amber-100"
                onClick={() => handlePrintTicket('bar', order.id, authHeaders)}
              >
                <Printer className="size-3.5 mr-1" />
                Imprimir barra
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
