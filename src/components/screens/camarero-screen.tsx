'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ArrowLeft,
  Plus,
  Search,
  XCircle,
  Minus,
  Flame,
  UserCircle,
  X,
  Pencil,
  ShoppingCart,
  Receipt,
  CircleDot,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRestaurantStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Product, TableItem, Order, Client } from '@/types/restaurant'
import { formatEUR, formatTime } from '@/lib/formatters'
import { zoneOrder, categoryOrder } from '@/lib/constants'
import { categoryConfig, zoneConfig } from '@/lib/config-ui'
import { useAuth } from '@/components/common/auth-context'

// ─── CAMARERO TAB ───────────────────────────────────────────────────────────

export function CamareroTab() {  const {
    currentOrderItems,
    addOrderItem,
    removeOrderItem,
    updateOrderItemQuantity,
    clearOrderItems,
    resetOrder,
  } = useRestaurantStore()
  const { authHeaders, handleFetchResponse } = useAuth()

  const [tables, setTables] = useState<TableItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [cashSessionOpen, setCashSessionOpen] = useState<boolean | null>(null) // null = loading

  // Flow state: 'tables' | 'menu'
  const [view, setView] = useState<'tables' | 'menu'>('tables')
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('bebida')
  const [sending, setSending] = useState(false)
  const [editingNoteProductId, setEditingNoteProductId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // Existing orders for the selected table (shown in menu view)
  const [tableOrders, setTableOrders] = useState<Order[]>([])

  // No cuenta/cobrar state — camarero only requests bill, caja handles payment

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setTables(json.tables.filter((t: TableItem) => t.active))
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setProducts(json.products.filter((p: Product) => p.active))
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse])

  const searchClients = useCallback(async (q: string) => {
    if (!q.trim()) { setClients([]); return }
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}`, { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setClients(json.clients)
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse])

  // fetchCuentaOrders removed — camarero no longer needs it

  // Fetch existing orders for the currently selected table
  const fetchTableOrders = useCallback(async (tableId: string) => {
    try {
      const url = `/api/orders?status=pending,in_progress,ready,served,bill_requested&tableId=${tableId}`
      console.log('[Camarero] fetchTableOrders:', url)
      const res = await fetch(url, { headers: authHeaders(false) })
      console.log('[Camarero] fetchTableOrders response:', res.status)
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        console.log('[Camarero] fetchTableOrders got:', json.orders?.length, 'orders')
        json.orders?.forEach((o: Order) => {
          console.log(`[Camarero]   Order ${o.id}: status=${o.status}, items=${o.items.length}`, 
            o.items.map((i) => ({ name: i.product?.name, dest: i.destination, status: i.status })))
        })
        setTableOrders(json.orders)
      } else {
        const errText = await res.text().catch(() => '')
        console.error('[Camarero] fetchTableOrders failed:', res.status, errText)
      }
    } catch (err) {
      console.error('[Camarero] fetchTableOrders error:', err)
    }
  }, [authHeaders, handleFetchResponse])

  const fetchCashSession = useCallback(async () => {
    try {
      const res = await fetch('/api/cash-sessions?current=true', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setCashSessionOpen(!!json.cashSession)
      } else {
        setCashSessionOpen(false)
      }
    } catch {
      setCashSessionOpen(false)
    }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTables(), fetchProducts(), fetchCashSession()])
      setLoading(false)
    }
    load()
    const interval = setInterval(() => {
      fetchTables()
      fetchCashSession()
    }, 8000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchProducts, fetchCashSession])

  // Polling: tables refresh via interval (Vercel-compatible, no Socket.io)

  const handleSelectTable = (table: TableItem) => {
    setSelectedTable(table)
    setView('menu')
    // Fetch existing orders for this table so we can show them
    fetchTableOrders(table.id)
  }

  const handleAddProduct = (product: Product) => {
    if (!cashSessionOpen) {
      toast.error('Caja cerrada. No se pueden tomar pedidos.')
      return
    }
    addOrderItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      notes: '',
      category: product.category,
    })
  }

  const currentTotal = currentOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleEnviarCocina = async () => {
    if (!selectedTable) return
    if (!cashSessionOpen) {
      toast.error('Caja cerrada. No se pueden tomar pedidos.')
      return
    }
    if (currentOrderItems.length === 0) {
      toast.error('Añade al menos un producto')
      return
    }
    setSending(true)
    try {
      const body = {
        tableId: selectedTable.id,
        clientId: selectedClientId || undefined,
        notes: '',
        items: currentOrderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: itemNotes[item.productId] ?? item.notes ?? '',
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })

      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        toast.success('Pedido enviado a cocina')
        resetOrder()
        setItemNotes({})
        setSelectedClientId('')
        setClientSearch('')
        setShowClientSearch(false)
        setProductSearch('')
        // Stay on menu view so user can see the order, refresh table orders
        fetchTableOrders(selectedTable.id)
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al enviar pedido')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSending(false)
    }
  }

  // Request bill: mark table as bill_requested (blocks further orders)
  const [requestingBill, setRequestingBill] = useState(false)
  const handleRequestBill = async (table: TableItem) => {
    if (!cashSessionOpen) {
      toast.error('Caja cerrada. No se puede pedir la cuenta.')
      return
    }
    setRequestingBill(true)
    try {
      const res = await fetch(`/api/tables/${table.id}/request-bill`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Cuenta solicitada. Caja debe cobrar.')
        // Refresh table data
        fetchTables()
        // Update selectedTable locally if this is the current table
        if (selectedTable?.id === table.id) {
          setSelectedTable({ ...table, status: 'bill_requested' })
          fetchTableOrders(table.id)
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al pedir la cuenta')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setRequestingBill(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelTargetId) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${cancelTargetId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Pedido cancelado')
        if (selectedTable) fetchTableOrders(selectedTable.id)
        fetchTables()
        setCancelTargetId(null)
      } else {
        let errorMsg = 'Error al cancelar pedido'
        try {
          const err = await res.json()
          errorMsg = err.error || errorMsg
        } catch { /* not JSON */ }
        toast.error(errorMsg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      toast.error(msg)
    } finally {
      setCancelling(false)
    }
  }

  // handleCobrar removed — camarero does not charge. Caja handles payment.

  // Filter products by active category and search
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = p.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Group tables by zone
  const tablesByZone = zoneOrder
    .map((z) => ({
      zone: z,
      config: zoneConfig[z],
      tables: tables.filter((t) => t.zone === z),
    }))
    .filter((g) => g.tables.length > 0)

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  // ─── Menu View ───────────────────────────────────────────────
  if (view === 'menu' && selectedTable) {
    const isOccupied = selectedTable.status === 'occupied'
    const isBillRequested = selectedTable.status === 'bill_requested'
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button variant="outline" size="sm" className="h-12" onClick={() => { setView('tables'); setSelectedTable(null); setTableOrders([]) }}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={`flex size-10 items-center justify-center rounded-lg font-bold text-lg ${isBillRequested ? 'bg-amber-100 text-amber-800' : 'bg-amber-100 text-amber-800'}`}>
              {selectedTable.number}
            </div>
            <div>
              <p className="font-bold text-lg">Mesa {selectedTable.number}</p>
              <p className="text-xs text-muted-foreground">{zoneConfig[selectedTable.zone]?.label ?? selectedTable.zone}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isBillRequested && (
              <Badge className="bg-amber-500 text-white text-xs animate-pulse">
                <Receipt className="size-3 mr-1" />
                Cuenta pedida
              </Badge>
            )}
            {isOccupied && (
              <Button
                size="sm"
                className="h-10 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleRequestBill(selectedTable)}
                disabled={requestingBill || !cashSessionOpen}
                title={!cashSessionOpen ? 'La caja está cerrada' : undefined}
              >
                <Receipt className="size-4 mr-1" />
                {requestingBill ? 'Solicitando...' : 'Pedir cuenta'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => setShowClientSearch(!showClientSearch)}
              disabled={isBillRequested}
            >
              <UserCircle className="size-4 mr-1" />
              {selectedClientId ? clients.find((c) => c.id === selectedClientId)?.name ?? 'Cliente' : 'Cliente'}
            </Button>
          </div>
        </div>

        {/* Cash closed banner */}
        {cashSessionOpen === false && (
          <div className="flex items-center gap-2 p-3 rounded-none bg-red-50 border-b border-red-200 text-red-800">
            <Lock className="size-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Caja cerrada</p>
              <p className="text-xs text-red-600">No se pueden tomar pedidos ni pedir cuenta hasta que se abra la caja.</p>
            </div>
          </div>
        )}

        {/* Bill requested warning banner */}
        {isBillRequested && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-2">
            <Receipt className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">Mesa bloqueada — Cuenta pedida</p>
              <p className="text-xs text-amber-600">No se pueden añadir más productos. Caja debe cobrar.</p>
            </div>
          </div>
        )}

        {/* Existing orders for this table */}
        {tableOrders.length > 0 && (
          <div className="border-b bg-orange-50/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-amber-800">
                <Receipt className="size-4 inline mr-1" />
                Pedidos activos ({tableOrders.length})
              </p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fetchTableOrders(selectedTable.id)}>
                <ShoppingCart className="size-3 mr-1" />
                Refrescar
              </Button>
            </div>
            <div className="space-y-2">
              {tableOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg p-2 border text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant="outline"
                      className={
                        order.status === 'bill_requested'
                          ? 'bg-amber-100 text-amber-800 border-amber-200 text-xs'
                          : order.status === 'ready'
                          ? 'bg-green-100 text-green-800 border-green-200 text-xs'
                          : order.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 border-amber-200 text-xs'
                          : 'bg-orange-100 text-orange-800 border-orange-200 text-xs'
                      }
                    >
                      {order.status === 'bill_requested' ? '🧾 Cuenta pedida' : order.status === 'ready' ? '✅ Listo' : order.status === 'pending' ? '⏳ Pendiente' : '🔥 En curso'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setCancelTargetId(order.id)}
                        title="Cancelar pedido"
                      >
                        <XCircle className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span>
                          <span className="font-medium">{item.quantity}x</span>{' '}
                          {item.product?.name ?? 'Producto'}
                          {item.destination === 'bar' && <span className="text-amber-500 ml-1">🍹</span>}
                          {item.destination === 'kitchen' && <span className="text-orange-500 ml-1">🍳</span>}
                        </span>
                        <span className="text-muted-foreground">{formatEUR(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 pt-1 border-t text-xs font-semibold">
                    <span>Total pedido</span>
                    <span>{formatEUR(order.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Search */}
        {showClientSearch && (
          <div className="p-3 bg-amber-50 border-b">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); searchClients(e.target.value) }}
                  className="pl-9 h-12"
                />
              </div>
            </div>
            {clients.length > 0 && (
              <ScrollArea className="max-h-32 mt-2">
                <div className="space-y-1">
                  {clients.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left p-2 rounded-lg text-sm hover:bg-amber-100 transition-colors ${selectedClientId === c.id ? 'bg-amber-200' : ''}`}
                      onClick={() => { setSelectedClientId(c.id); setShowClientSearch(false); setClientSearch('') }}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground ml-2">{c.phone}</span>
                      {c.points > 0 && <Badge variant="outline" className="ml-2 text-xs">{c.points} pts</Badge>}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {selectedClientId && (
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-amber-600 text-white">
                  {clients.find((c) => c.id === selectedClientId)?.name ?? 'Cliente'}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setSelectedClientId('')}>
                  <X className="size-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search bar */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9 h-12"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 p-3 overflow-x-auto border-b" style={{ scrollbarWidth: 'none' }}>
          {categoryOrder.map((cat) => {
            const cfg = categoryConfig[cat]
            if (!cfg) return null
            const count = products.filter((p) => p.category === cat).length
            if (count === 0) return null
            return (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                className={`h-11 shrink-0 ${activeCategory === cat ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cfg.icon}
                <span className="ml-1">{cfg.label}</span>
              </Button>
            )
          })}
        </div>

        {/* Product grid — blocked when bill_requested */}
        <div className="flex-1 overflow-y-auto p-3">
          {isBillRequested ? (
            <div className="flex flex-col items-center justify-center py-12 text-amber-500">
              <Receipt className="size-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No se pueden añadir productos</p>
              <p className="text-xs text-amber-400 mt-1">La cuenta ya ha sido solicitada</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay productos en esta categoría</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inOrder = currentOrderItems.find((i) => i.productId === product.id)
                return (
                  <button
                    key={product.id}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 bg-white transition-all min-h-[90px] sm:min-h-[100px] ${!cashSessionOpen ? 'opacity-50 cursor-not-allowed border-gray-200' : 'hover:bg-amber-50 hover:border-amber-400 active:scale-95'}`}
                    onClick={() => cashSessionOpen && handleAddProduct(product)}
                    disabled={!cashSessionOpen}
                    title={!cashSessionOpen ? 'La caja está cerrada' : undefined}
                  >
                    {inOrder && (
                      <div className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-bold shadow">
                        {inOrder.quantity}
                      </div>
                    )}
                    <span className="font-semibold text-sm text-center leading-tight">{product.name}</span>
                    <span className="text-amber-700 font-bold mt-1">{formatEUR(product.price)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Order summary bar — hidden when bill_requested */}
        {!isBillRequested && currentOrderItems.length > 0 && (
          <div className="border-t bg-amber-50 flex flex-col max-h-[35vh] md:max-h-[45vh] shrink-0">
            <ScrollArea className="flex-1 overflow-y-auto p-3 pb-1">
              <div className="space-y-2">
                {currentOrderItems.map((item) => {
                  const note = itemNotes[item.productId] ?? item.notes ?? ''
                  return (
                  <div key={item.productId}>
                    <div className="flex items-center justify-between text-sm gap-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-medium truncate">{item.name}</span>
                        <button
                          className={`shrink-0 size-5 flex items-center justify-center rounded transition-colors ${note ? 'bg-amber-200 text-amber-800 hover:bg-amber-300' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                          onClick={() => { setEditingNoteProductId(item.productId); setEditingNoteText(note) }}
                          title={note ? `Nota: ${note}` : 'Añadir nota'}
                        >
                          <Pencil className="size-2.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => updateOrderItemQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => updateOrderItemQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                        <span className="w-14 text-right font-semibold text-xs">{formatEUR(item.price * item.quantity)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeOrderItem(item.productId)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                    {note && <p className="text-xs text-amber-700 mt-0.5 pl-0.5 truncate">📝 {note}</p>}
                  </div>
                  )
                })}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between p-2 sm:p-3 pt-2 border-t shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{currentOrderItems.length} items</span>
                <span className="text-lg sm:text-xl font-bold text-amber-800">{formatEUR(currentTotal)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-10 sm:h-12 sm:flex-1" onClick={() => { clearOrderItems(); setItemNotes({}) }}>
                  Limpiar
                </Button>
                <Button
                  className="h-12 sm:h-12 bg-amber-600 hover:bg-amber-700 text-white text-sm sm:text-base font-bold px-4 sm:px-6 sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleEnviarCocina}
                  disabled={sending || !cashSessionOpen}
                  title={!cashSessionOpen ? 'La caja está cerrada' : undefined}
                >
                  <Flame className="size-4 sm:size-5 mr-1 sm:mr-2" />
                  {sending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Note editing dialog */}
        <Dialog open={editingNoteProductId !== null} onOpenChange={(open) => { if (!open) setEditingNoteProductId(null) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                <Pencil className="size-4 inline mr-1.5 text-amber-600" />
                Nota: {currentOrderItems.find((i) => i.productId === editingNoteProductId)?.name ?? 'Item'}
              </DialogTitle>
              <DialogDescription>Añade instrucciones especiales para este item (sin cebolla, poco hecho, etc.)</DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Ej: Sin cebolla, poco hecho, sin sal..."
              value={editingNoteText}
              onChange={(e) => setEditingNoteText(e.target.value)}
              className="min-h-[80px] resize-none"
              autoFocus
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { setEditingNoteProductId(null); setEditingNoteText('') }}>Cancelar</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
                if (editingNoteProductId) {
                  setItemNotes((prev) => ({ ...prev, [editingNoteProductId]: editingNoteText }))
                }
                setEditingNoteProductId(null)
              }}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Cancel confirmation dialog */}
        <AlertDialog open={cancelTargetId !== null} onOpenChange={(open) => { if (!open) setCancelTargetId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Se cancelará el pedido. Los productos volverán al stock y la mesa quedará libre si no tiene otros pedidos activos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancelTargetId(null)}>No, mantener</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCancelOrder} disabled={cancelling}>
                {cancelling ? 'Cancelando...' : 'Sí, cancelar pedido'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ─── Table Selection View ────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Cash closed banner */}
      {cashSessionOpen === false && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <Lock className="size-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Caja cerrada</p>
            <p className="text-xs text-red-600">No se pueden tomar pedidos ni pedir cuenta hasta que se abra la caja.</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Camarero</h2>
        <div className="flex items-center gap-2">
          {currentOrderItems.length > 0 && (
            <Badge className="bg-amber-600 text-white text-sm">
              <ShoppingCart className="size-3 mr-1" />
              {currentOrderItems.length} items · {formatEUR(currentTotal)}
            </Badge>
          )}
          <Button variant="outline" size="sm" className="h-10" onClick={fetchTables}>
            <ShoppingCart className="size-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {tablesByZone.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">No hay mesas configuradas.</p>
          </CardContent>
        </Card>
      ) : (
        tablesByZone.map(({ zone, config: cfg, tables: zoneTables }) => (
          <div key={zone}>
            <div className="flex items-center gap-2 mb-3">
              {cfg?.icon ?? <CircleDot className="size-4" />}
              <h3 className="font-semibold text-lg">{cfg?.label ?? zone}</h3>
              <Badge variant="outline" className="text-xs">{zoneTables.length}</Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {zoneTables.map((table) => {
                const isAvailable = table.status === 'available'
                const isOccupied = table.status === 'occupied'
                const isReserved = table.status === 'reserved'
                const isBillRequested = table.status === 'bill_requested'
                return (
                  <button
                    key={table.id}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[100px] active:scale-95 ${
                      isAvailable
                        ? 'bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-500'
                        : isBillRequested
                        ? 'bg-amber-50 border-amber-400 hover:bg-amber-100'
                        : isOccupied
                        ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
                        : isReserved
                        ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                    onClick={() => handleSelectTable(table)}
                  >
                    <span className="text-3xl font-bold">{table.number}</span>
                    <span className="text-xs mt-1 capitalize">
                      {isAvailable ? '🟢 Libre' : isBillRequested ? '🟠 Cuenta pedida' : isOccupied ? '🔴 Ocupada' : isReserved ? '🟡 Reservada' : table.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{table.capacity} pax</span>
                    {isBillRequested && (
                      <Badge className="mt-1 bg-amber-500 text-white text-[10px] px-2 py-0">
                        <Receipt className="size-2.5 mr-0.5" />Pendiente cobro
                      </Badge>
                    )}
                    {isOccupied && (
                      <button
                        className="mt-1 px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => { e.stopPropagation(); handleRequestBill(table) }}
                        disabled={requestingBill || !cashSessionOpen}
                        title={!cashSessionOpen ? 'La caja está cerrada' : undefined}
                      >
                        <Receipt className="size-3 inline mr-0.5" /> {requestingBill ? 'Solicitando...' : 'Pedir cuenta'}
                      </button>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Re-export with legacy name for backward compatibility
export { CamareroTab as CamareroScreen }
