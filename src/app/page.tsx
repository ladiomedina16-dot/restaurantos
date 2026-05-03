'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  Wifi,
  WifiOff,
  Plus,
  Search,
  Clock,
  ChefHat,
  CheckCircle,
  Utensils,
  Receipt,
  XCircle,
  Minus,
  Phone,
  Star,
  Flame,
  Beer,
  Salad,
  CookingPot,
  Sandwich,
  Soup,
  CakeSlice,
  MoreHorizontal,
  ArrowLeft,
  UserCircle,
  Wine,
  Sun,
  Coffee,
  CreditCard,
  Euro,
  Timer,
  CircleDot,
  CheckCheck,
  X,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useRestaurantStore, type TabId } from '@/lib/store'
import { getSocket, disconnectSocket } from '@/lib/socket'
import { toast } from 'sonner'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatEUR = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

const timeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `${diff} min`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

const elapsedColor = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 5) return 'text-green-400'
  if (diff < 10) return 'text-amber-400'
  return 'text-red-400'
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  imageUrl: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface TableItem {
  id: string
  number: number
  capacity: number
  status: string
  zone: string
  notes: string
  active: boolean
}

interface OrderItemDetail {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes: string
  product: { id: string; name: string; price: number; category: string }
}

interface Order {
  id: string
  tableId: string
  clientId: string | null
  status: string
  total: number
  subtotal?: number
  discount?: number
  notes: string
  createdAt: string
  updatedAt: string
  table: { id: string; number: number; zone: string }
  client: { id: string; name: string; phone: string; points?: number; visits?: number } | null
  items: OrderItemDetail[]
  _count?: { items: number }
}

interface Client {
  id: string
  name: string
  phone: string
  email: string
  points: number
  visits: number
  notes: string
  createdAt: string
  updatedAt: string
  _count?: { orders: number }
}

// ─── Category / Zone Config ─────────────────────────────────────────────────

const categoryConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  bebida: { label: 'Bebidas', icon: <Beer className="size-4" /> },
  tapa_fria: { label: 'Tapas Frías', icon: <Salad className="size-4" /> },
  tapa_caliente: { label: 'Tapas Calientes', icon: <CookingPot className="size-4" /> },
  montadito: { label: 'Montaditos', icon: <Sandwich className="size-4" /> },
  racion: { label: 'Raciones', icon: <Soup className="size-4" /> },
  postre: { label: 'Postres', icon: <CakeSlice className="size-4" /> },
  general: { label: 'Otros', icon: <MoreHorizontal className="size-4" /> },
  comida: { label: 'Comida', icon: <UtensilsCrossed className="size-4" /> },
}

const zoneConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  bar: { label: 'Barra', icon: <Wine className="size-4" /> },
  main: { label: 'Salón', icon: <Utensils className="size-4" /> },
  terrace: { label: 'Terraza', icon: <Sun className="size-4" /> },
  private: { label: 'Privado', icon: <Coffee className="size-4" /> },
}

const zoneOrder = ['bar', 'main', 'terrace', 'private']

const categoryOrder = ['bebida', 'tapa_fria', 'tapa_caliente', 'montadito', 'racion', 'postre', 'comida', 'general']

// ─── CAMARERO TAB ───────────────────────────────────────────────────────────

function CamareroTab() {
  const {
    currentOrderItems,
    addOrderItem,
    removeOrderItem,
    updateOrderItemQuantity,
    clearOrderItems,
    resetOrder,
  } = useRestaurantStore()

  const [tables, setTables] = useState<TableItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  // Flow state: 'tables' | 'menu'
  const [view, setView] = useState<'tables' | 'menu'>('tables')
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('bebida')
  const [sending, setSending] = useState(false)

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const json = await res.json()
        setTables(json.tables.filter((t: TableItem) => t.active))
      }
    } catch { /* silently fail */ }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const json = await res.json()
        setProducts(json.products.filter((p: Product) => p.active))
      }
    } catch { /* silently fail */ }
  }, [])

  const searchClients = useCallback(async (q: string) => {
    if (!q.trim()) { setClients([]); return }
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}`)
      if (res.ok) {
        const json = await res.json()
        setClients(json.clients)
      }
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTables(), fetchProducts()])
      setLoading(false)
    }
    load()
    const interval = setInterval(fetchTables, 10000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchProducts])

  // Socket: refresh tables on changes
  useEffect(() => {
    const socket = getSocket()
    const handler = () => { fetchTables() }
    socket.on('table-status-changed', handler)
    socket.on('table-cleared', handler)
    return () => { socket.off('table-status-changed', handler); socket.off('table-cleared', handler) }
  }, [fetchTables])

  const handleSelectTable = (table: TableItem) => {
    setSelectedTable(table)
    setView('menu')
  }

  const handleAddProduct = (product: Product) => {
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
          notes: item.notes,
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const json = await res.json()
        toast.success('Pedido enviado a cocina')
        const socket = getSocket()
        socket.emit('order-created', {
          type: 'created',
          order: json.order,
          timestamp: new Date().toISOString(),
        })
        resetOrder()
        setSelectedClientId('')
        setClientSearch('')
        setShowClientSearch(false)
        setProductSearch('')
        setView('tables')
        setSelectedTable(null)
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
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button variant="outline" size="sm" className="h-12" onClick={() => { setView('tables'); setSelectedTable(null) }}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-lg">
              {selectedTable.number}
            </div>
            <div>
              <p className="font-bold text-lg">Mesa {selectedTable.number}</p>
              <p className="text-xs text-muted-foreground">{zoneConfig[selectedTable.zone]?.label ?? selectedTable.zone}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => setShowClientSearch(!showClientSearch)}
            >
              <UserCircle className="size-4 mr-1" />
              {selectedClientId ? clients.find((c) => c.id === selectedClientId)?.name ?? 'Cliente' : 'Cliente'}
            </Button>
          </div>
        </div>

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
                className={`h-10 shrink-0 ${activeCategory === cat ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cfg.icon}
                <span className="ml-1">{cfg.label}</span>
              </Button>
            )
          })}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay productos en esta categoría</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => {
                const inOrder = currentOrderItems.find((i) => i.productId === product.id)
                return (
                  <button
                    key={product.id}
                    className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 bg-white hover:bg-amber-50 hover:border-amber-400 transition-all min-h-[100px] active:scale-95"
                    onClick={() => handleAddProduct(product)}
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

        {/* Order summary bar */}
        {currentOrderItems.length > 0 && (
          <div className="border-t bg-amber-50 p-3">
            <ScrollArea className="max-h-32 mb-2">
              <div className="space-y-1">
                {currentOrderItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="size-8 p-0"
                        onClick={() => updateOrderItemQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="size-8 p-0"
                        onClick={() => updateOrderItemQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                      <span className="w-16 text-right font-semibold">{formatEUR(item.price * item.quantity)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeOrderItem(item.productId)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <span className="text-sm text-muted-foreground">{currentOrderItems.length} items</span>
                <span className="ml-3 text-xl font-bold text-amber-800">{formatEUR(currentTotal)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-12" onClick={() => { clearOrderItems() }}>
                  Limpiar
                </Button>
                <Button
                  className="h-12 bg-amber-600 hover:bg-amber-700 text-white text-base font-bold px-6"
                  onClick={handleEnviarCocina}
                  disabled={sending}
                >
                  <Flame className="size-5 mr-2" />
                  {sending ? 'Enviando...' : 'Enviar a Cocina'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Table Selection View ────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Camarero</h2>
        <Button variant="outline" size="sm" className="h-10" onClick={fetchTables}>
          <ShoppingCart className="size-4 mr-1" />
          Actualizar
        </Button>
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
                return (
                  <button
                    key={table.id}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[100px] active:scale-95 ${
                      isAvailable
                        ? 'bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-500'
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
                      {isAvailable ? '🟢 Libre' : isOccupied ? '🔴 Ocupada' : isReserved ? '🟡 Reservada' : table.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{table.capacity} pax</span>
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

// ─── COCINA TAB (KDS) ──────────────────────────────────────────────────────

function CocinaTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?status=pending,in_progress')
      if (res.ok) {
        const json = await res.json()
        setOrders(json.orders)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // Update time display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  // Socket listeners
  useEffect(() => {
    const socket = getSocket()
    socket.emit('join-room', 'kitchen')

    const onOrderCreated = (data: { order: Order }) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === data.order.id)) return prev
        return [data.order, ...prev]
      })
      toast.info(`Nuevo pedido - Mesa ${data.order.table?.number ?? '?'}`)
    }

    const onOrderStatusChanged = (data: { order: Order }) => {
      if (data.order.status === 'ready' || data.order.status === 'paid' || data.order.status === 'cancelled') {
        setOrders((prev) => prev.filter((o) => o.id !== data.order.id))
      } else {
        setOrders((prev) => prev.map((o) => o.id === data.order.id ? data.order : o))
      }
    }

    const onOrderReady = (data: { order: Order }) => {
      setOrders((prev) => prev.filter((o) => o.id !== data.order.id))
    }

    socket.on('order-created', onOrderCreated)
    socket.on('order-status-changed', onOrderStatusChanged)
    socket.on('order-ready', onOrderReady)

    return () => {
      socket.off('order-created', onOrderCreated)
      socket.off('order-status-changed', onOrderStatusChanged)
      socket.off('order-ready', onOrderReady)
    }
  }, [])

  const handleTerminar = async (order: Order) => {
    setFinishing(order.id)
    try {
      // First set to in_progress if pending
      if (order.status === 'pending') {
        await fetch(`/api/orders/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_progress' }),
        })
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      })

      if (res.ok) {
        const json = await res.json()
        toast.success(`Mesa ${order.table?.number ?? '?'} — Pedido listo`)
        const socket = getSocket()
        socket.emit('order-ready', {
          type: 'ready',
          order: json.order,
          tableId: order.tableId,
          timestamp: new Date().toISOString(),
        })
        setOrders((prev) => prev.filter((o) => o.id !== order.id))
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar pedido')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setFinishing(null)
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
    <div className="bg-gray-900 rounded-xl p-4 min-h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ChefHat className="size-8 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Cocina</h2>
          <Badge className="bg-amber-600 text-white text-sm">{orders.length} pedidos</Badge>
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
          <p className="text-sm mt-1">No hay pedidos pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-gray-800 rounded-xl p-4 border-l-4 transition-all ${
                order.status === 'pending' ? 'border-l-amber-500' : 'border-l-orange-500'
              } ${finishing === order.id ? 'opacity-50 scale-95' : ''}`}
            >
              {/* Card header: Mesa + Time */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-3xl font-bold text-white">Mesa {order.table?.number ?? '?'}</p>
                  <p className="text-sm text-gray-400">{zoneConfig[order.table?.zone]?.label ?? order.table?.zone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">{formatTime(order.createdAt)}</p>
                  <p className={`text-lg font-bold ${elapsedColor(order.createdAt)}`}>
                    <Timer className="size-4 inline mr-1" />
                    {timeAgo(order.createdAt)}
                  </p>
                </div>
              </div>

              {/* Status badge */}
              <Badge
                className={`mb-3 ${
                  order.status === 'pending'
                    ? 'bg-amber-600/20 text-amber-400 border-amber-600/30'
                    : 'bg-orange-600/20 text-orange-400 border-orange-600/30'
                }`}
                variant="outline"
              >
                {order.status === 'pending' ? '⏳ Pendiente' : '🔥 En preparación'}
              </Badge>

              {/* Items list */}
              <div className="space-y-1 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-white">
                    <span className="flex size-6 items-center justify-center rounded bg-amber-600/30 text-amber-300 text-xs font-bold shrink-0">
                      {item.quantity}
                    </span>
                    <span className="text-sm leading-tight">{item.product?.name ?? 'Producto'}</span>
                    {item.notes && (
                      <span className="text-xs text-amber-400 ml-1">({item.notes})</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Client info if any */}
              {order.client && (
                <p className="text-xs text-gray-500 mb-3">
                  <UserCircle className="size-3 inline mr-1" />
                  {order.client.name}
                </p>
              )}

              {/* Terminar button */}
              <Button
                className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleTerminar(order)}
                disabled={finishing === order.id}
              >
                <CheckCircle className="size-6 mr-2" />
                TERMINAR
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CAJA TAB (Cash Register) ───────────────────────────────────────────────

function CajaTab() {
  const [tables, setTables] = useState<TableItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingTable, setPayingTable] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [now, setNow] = useState(Date.now())

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const json = await res.json()
        setTables(json.tables.filter((t: TableItem) => t.active))
      }
    } catch { /* silently fail */ }
  }, [])

  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?status=pending,in_progress,ready,served')
      if (res.ok) {
        const json = await res.json()
        setOrders(json.orders)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTables(), fetchActiveOrders()])
      setLoading(false)
    }
    load()
    const interval = setInterval(() => { fetchTables(); fetchActiveOrders() }, 15000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchActiveOrders])

  // Update time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  // Socket listeners
  useEffect(() => {
    const socket = getSocket()
    socket.emit('join-room', 'caja')

    const refresh = () => { fetchTables(); fetchActiveOrders() }
    socket.on('order-created', refresh)
    socket.on('order-ready', refresh)
    socket.on('order-status-changed', refresh)
    socket.on('table-cleared', refresh)
    socket.on('table-status-changed', refresh)

    return () => {
      socket.off('order-created', refresh)
      socket.off('order-ready', refresh)
      socket.off('order-status-changed', refresh)
      socket.off('table-cleared', refresh)
      socket.off('table-status-changed', refresh)
    }
  }, [fetchTables, fetchActiveOrders])

  // Get orders for a table
  const getTableOrders = (tableId: string) =>
    orders.filter((o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status))

  // Check if table has "ready" orders
  const hasReadyOrders = (tableId: string) =>
    getTableOrders(tableId).some((o) => o.status === 'ready')

  // Selected table for payment
  const selectedTableId = payingTable
  const selectedTable = tables.find((t) => t.id === selectedTableId)
  const selectedOrders = selectedTableId ? getTableOrders(selectedTableId) : []

  // Calculate totals for selected table
  const allItems = selectedOrders.flatMap((o) => o.items)
  const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0)

  // 5ª Gratis calculation
  const bebidasTotal = allItems
    .filter((i) => i.product?.category === 'bebida')
    .reduce((s, i) => s + i.quantity, 0)
  const freeDrinks = Math.floor(bebidasTotal / 5)
  const discount = freeDrinks * 1.50
  const hasClient = selectedOrders.some((o) => o.clientId !== null)
  const finalDiscount = hasClient ? discount : 0
  const total = Math.max(0, subtotal - finalDiscount)
  const pointsEarned = Math.floor(total)

  // Get the client info from orders
  const clientInfo = selectedOrders.find((o) => o.client)?.client

  const handleCobrar = async () => {
    if (!selectedTableId || selectedOrders.length === 0) return
    setPaying(true)
    try {
      // Pay each order
      for (const order of selectedOrders) {
        const res = await fetch(`/api/orders/${order.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applyDiscount: true }),
        })
        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error || 'Error al cobrar pedido')
          setPaying(false)
          return
        }
      }
      toast.success(`Mesa ${selectedTable?.number ?? '?'} cobrada — ${formatEUR(total)}`)
      const socket = getSocket()
      socket.emit('table-cleared', {
        tableId: selectedTableId,
        tableNumber: selectedTable?.number,
        timestamp: new Date().toISOString(),
      })
      setPayingTable(null)
      fetchTables()
      fetchActiveOrders()
    } catch {
      toast.error('Error de red')
    } finally {
      setPaying(false)
    }
  }

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

  // ─── Payment Panel ──────────────────────────────────────────
  if (selectedTableId && selectedTable) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-12" onClick={() => setPayingTable(null)}>
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="text-2xl font-bold">Mesa {selectedTable.number}</h2>
          <span className="text-muted-foreground">{zoneConfig[selectedTable.zone]?.label ?? selectedTable.zone}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Orders & Items */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="size-5" />
                Pedidos activos ({selectedOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                {selectedOrders.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay pedidos activos</p>
                ) : (
                  <div className="space-y-4">
                    {selectedOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className={
                              order.status === 'ready'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : order.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-orange-100 text-orange-800 border-orange-200'
                            }
                          >
                            {order.status === 'ready' ? '✅ Listo' : order.status === 'pending' ? '⏳ Pendiente' : '🔥 En curso'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</span>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                <span className="font-medium">{item.quantity}x</span>{' '}
                                {item.product?.name ?? 'Producto'}
                              </span>
                              <span className="text-muted-foreground">{formatEUR(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                        {order.client && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <UserCircle className="size-3 inline mr-1" />
                            {order.client.name} · {order.client.phone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Totals & Pay */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="size-5" />
                Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client info */}
              {clientInfo && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <UserCircle className="size-5 text-amber-600" />
                    <span className="font-semibold">{clientInfo.name}</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span><Phone className="size-3 inline mr-1" />{clientInfo.phone}</span>
                    {clientInfo.points !== undefined && <span><Star className="size-3 inline mr-1" />{clientInfo.points} pts</span>}
                    {clientInfo.visits !== undefined && <span>Visitas: {clientInfo.visits}</span>}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatEUR(subtotal)}</span>
                </div>

                {/* 5ª Gratis */}
                {hasClient && freeDrinks > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>
                      <Beer className="size-3 inline mr-1" />
                      5ª GRATIS: {freeDrinks} bebida{freeDrinks > 1 ? 's' : ''} gratis
                    </span>
                    <span>-{formatEUR(finalDiscount)}</span>
                  </div>
                )}
                {hasClient && bebidasTotal > 0 && freeDrinks === 0 && (
                  <div className="text-xs text-muted-foreground">
                    <Beer className="size-3 inline mr-1" />
                    {bebidasTotal}/5 bebidas para 5ª gratis
                  </div>
                )}
                {!hasClient && bebidasTotal >= 5 && (
                  <div className="text-xs text-amber-600">
                    <Beer className="size-3 inline mr-1" />
                    Asigna un cliente para aplicar 5ª gratis ({bebidasTotal} bebidas)
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-amber-700">{formatEUR(total)}</span>
                </div>

                {pointsEarned > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <Star className="size-3 inline mr-1" />
                    Puntos a ganar: <span className="font-semibold text-amber-700">{pointsEarned}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCobrar}
                disabled={paying || selectedOrders.length === 0}
              >
                <Euro className="size-6 mr-2" />
                {paying ? 'Cobrando...' : 'COBRAR'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── Tables Overview ────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Caja</h2>
        <Button variant="outline" size="sm" className="h-10" onClick={() => { fetchTables(); fetchActiveOrders() }}>
          <ShoppingCart className="size-4 mr-1" />
          Actualizar
        </Button>
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
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {zoneTables.map((table) => {
                const tableOrders = getTableOrders(table.id)
                const isAvailable = table.status === 'available'
                const isOccupied = table.status === 'occupied'
                const isReady = hasReadyOrders(table.id)
                const orderTotal = tableOrders.reduce((s, o) => s + (o.subtotal ?? o.total), 0)
                const itemCount = tableOrders.reduce((s, o) => s + o.items.length, 0)

                return (
                  <button
                    key={table.id}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[120px] ${
                      isReady
                        ? 'bg-amber-50 border-amber-400 hover:bg-amber-100 animate-pulse'
                        : isAvailable
                        ? 'bg-green-50 border-green-300 opacity-60'
                        : isOccupied
                        ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 hover:border-orange-500'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                    onClick={() => !isAvailable && setPayingTable(table.id)}
                    disabled={isAvailable}
                  >
                    {isReady && (
                      <div className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">
                        !
                      </div>
                    )}
                    <span className="text-3xl font-bold">{table.number}</span>
                    {isAvailable ? (
                      <span className="text-xs text-green-600 mt-1">Libre</span>
                    ) : (
                      <>
                        <span className="text-xs mt-1">
                          {isReady ? '🟢 ¡Listo!' : '🔴 Ocupada'}
                        </span>
                        {itemCount > 0 && (
                          <span className="text-xs font-semibold text-amber-800 mt-0.5">
                            {itemCount} items · {formatEUR(orderTotal)}
                          </span>
                        )}
                      </>
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

// ─── ADMIN STUB TABS ────────────────────────────────────────────────────────

function AdminStub({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="mb-4 opacity-30">{icon}</div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p>Accede desde el panel de administración</p>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  const { activeTab, setActiveTab, realtimeConnected, setRealtimeConnected } = useRestaurantStore()

  // Socket connection
  useEffect(() => {
    const socket = getSocket()

    socket.on('connect', () => {
      setRealtimeConnected(true)
    })

    socket.on('disconnect', () => {
      setRealtimeConnected(false)
    })

    // If already connected
    if (socket.connected) {
      setRealtimeConnected(true)
    }

    return () => {
      disconnectSocket()
    }
  }, [setRealtimeConnected])

  const mainTabs = [
    { id: 'camarero' as TabId, label: 'Camarero', icon: <Utensils className="size-4" /> },
    { id: 'cocina' as TabId, label: 'Cocina', icon: <ChefHat className="size-4" /> },
    { id: 'caja' as TabId, label: 'Caja', icon: <CreditCard className="size-4" /> },
  ]

  const adminTabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { id: 'products' as TabId, label: 'Productos', icon: <Package className="size-4" /> },
    { id: 'tables' as TabId, label: 'Mesas', icon: <UtensilsCrossed className="size-4" /> },
    { id: 'orders' as TabId, label: 'Pedidos', icon: <Receipt className="size-4" /> },
    { id: 'clients' as TabId, label: 'Clientes', icon: <Users className="size-4" /> },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Flame className="size-6 text-amber-600" />
            <span className="font-bold text-lg hidden sm:inline">RestaurantOS</span>
          </div>
          <div className="flex items-center gap-2">
            {realtimeConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                <Wifi className="size-3 mr-1" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                <WifiOff className="size-3 mr-1" /> Offline
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          {/* Main tabs */}
          <div className="mb-4">
            <TabsList className="h-12 bg-amber-100/60 p-1">
              {mainTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-10 data-[state=active]:bg-amber-600 data-[state=active]:text-white gap-1.5 text-sm font-medium px-4"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="camarero" className="mt-0">
            <CamareroTab />
          </TabsContent>

          <TabsContent value="cocina" className="mt-0">
            <CocinaTab />
          </TabsContent>

          <TabsContent value="caja" className="mt-0">
            <CajaTab />
          </TabsContent>

          {/* Admin tabs - small secondary row */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Administración</p>
            <TabsList className="h-9 bg-muted p-0.5">
              {adminTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-8 data-[state=active]:bg-background gap-1 text-xs font-medium px-3"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-2">
            <AdminStub title="Dashboard" icon={<LayoutDashboard className="size-12" />} />
          </TabsContent>

          <TabsContent value="products" className="mt-2">
            <AdminStub title="Productos" icon={<Package className="size-12" />} />
          </TabsContent>

          <TabsContent value="tables" className="mt-2">
            <AdminStub title="Mesas" icon={<UtensilsCrossed className="size-12" />} />
          </TabsContent>

          <TabsContent value="orders" className="mt-2">
            <AdminStub title="Pedidos" icon={<Receipt className="size-12" />} />
          </TabsContent>

          <TabsContent value="clients" className="mt-2">
            <AdminStub title="Clientes" icon={<Users className="size-12" />} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
