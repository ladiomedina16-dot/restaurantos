'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  Plus,
  Search,
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
  LogOut,
  Printer,
  BarChart3,
  Lock,
  AlertTriangle,
  Building2,
  Shield,
  Eye,
  Ban,
  RotateCcw,
  Settings,
  ClipboardList,
  UserPlus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRestaurantStore, type TabId } from '@/lib/store'
import { toast } from 'sonner'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatEUR = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

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

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; description: string; price: number; category: string; stock: number; imageUrl: string; active: boolean; createdAt: string; updatedAt: string
}

interface TableItem {
  id: string; number: number; capacity: number; status: string; zone: string; notes: string; active: boolean
}

interface OrderItemDetail {
  id: string; productId: string; quantity: number; unitPrice: number; subtotal: number; notes: string; modifiers: string; product: { id: string; name: string; price: number; category: string }
}

interface Order {
  id: string; tableId: string; clientId: string | null; status: string; total: number; subtotal?: number; discount?: number; notes: string; createdById?: string | null; finishedById?: string | null; createdAt: string; updatedAt: string; table: { id: string; number: number; zone: string }; client: { id: string; name: string; phone: string; points?: number; visits?: number } | null; items: OrderItemDetail[]; _count?: { items: number }
}

interface Client {
  id: string; name: string; phone: string; email: string; points: number; visits: number; notes: string; createdAt: string; updatedAt: string; _count?: { orders: number }
}

interface RestaurantInfo {
  id: string; name: string; slug: string; address: string; phone: string; active: boolean; subscriptionStatus: string; createdAt: string; updatedAt: string; _count?: { users: number; tables: number; products: number; orders: number }; users?: { id: string; username: string; name: string; active: boolean }[]
}

interface UserInfo {
  id: string; username: string; name: string; role: string; active: boolean; mustChangePassword: boolean; zone?: string | null; restaurantId?: string | null; createdAt: string; updatedAt: string
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

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Administrador', encargado: 'Encargado',
  camarero: 'Camarero', cocina: 'Cocinero', caja: 'Caja',
}

const subStatusConfig: Record<string, { label: string; color: string }> = {
  trial: { label: 'Prueba', color: 'bg-amber-100 text-amber-800' },
  active: { label: 'Activo', color: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspendido', color: 'bg-red-100 text-red-800' },
}

// ─── Auth Context ────────────────────────────────────────────────────────────

interface AuthContextType {
  authToken: string | null
  currentUser: { userId: string; username: string; role: string; name: string; restaurantId?: string; mustChangePassword?: boolean } | null
  authHeaders: (contentType?: boolean) => Record<string, string>
  handleFetchResponse: (res: Response) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// ─── Print Helper ──────────────────────────────────────────────────────────

const handlePrintTicket = async (type: 'kitchen' | 'bar' | 'receipt', orderId: string, authHeaders: (contentType?: boolean) => Record<string, string>) => {
  try {
    const res = await fetch('/api/print', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ type, orderId }) })
    if (res.ok) {
      const { html } = await res.json()
      const printWindow = window.open('', '_blank', 'width=320,height=600')
      if (printWindow) { printWindow.document.write(html); printWindow.document.close(); printWindow.focus(); printWindow.print() }
    } else { toast.error('Error al imprimir ticket') }
  } catch { toast.error('Error al imprimir ticket') }
}

// ─── CAMARERO TAB ───────────────────────────────────────────────────────────

function CamareroTab() {
  const { currentOrderItems, addOrderItem, removeOrderItem, updateOrderItemQuantity, clearOrderItems, resetOrder } = useRestaurantStore()
  const { authHeaders, handleFetchResponse } = useAuth()
  const [tables, setTables] = useState<TableItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'tables' | 'menu'>('tables')
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('bebida')
  const [sending, setSending] = useState(false)

  const fetchTables = useCallback(async () => {
    try { const res = await fetch('/api/tables', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setTables(json.tables.filter((t: TableItem) => t.active)) } } catch { /* */ }
  }, [authHeaders, handleFetchResponse])

  const fetchProducts = useCallback(async () => {
    try { const res = await fetch('/api/products', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setProducts(json.products.filter((p: Product) => p.active)) } } catch { /* */ }
  }, [authHeaders, handleFetchResponse])

  const searchClients = useCallback(async (q: string) => {
    if (!q.trim()) { setClients([]); return }
    try { const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}`, { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setClients(json.clients) } } catch { /* */ }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { const load = async () => { await Promise.all([fetchTables(), fetchProducts()]); setLoading(false) }; load(); const interval = setInterval(fetchTables, 8000); return () => clearInterval(interval) }, [fetchTables, fetchProducts])

  const handleSelectTable = (table: TableItem) => { setSelectedTable(table); setView('menu') }
  const handleAddProduct = (product: Product) => { addOrderItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, notes: '', category: product.category }) }
  const currentTotal = currentOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleEnviarCocina = async () => {
    if (!selectedTable) return
    if (currentOrderItems.length === 0) { toast.error('Añade al menos un producto'); return }
    setSending(true)
    try {
      const body = { tableId: selectedTable.id, clientId: selectedClientId || undefined, notes: '', items: currentOrderItems.map((item) => ({ productId: item.productId, quantity: item.quantity, notes: item.notes })) }
      const res = await fetch('/api/orders', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
      if (handleFetchResponse(res) && res.ok) { toast.success('Pedido enviado a cocina'); resetOrder(); setSelectedClientId(''); setClientSearch(''); setShowClientSearch(false); setProductSearch(''); setView('tables'); setSelectedTable(null); fetchTables() }
      else { const err = await res.json(); toast.error(err.error || 'Error al enviar pedido') }
    } catch { toast.error('Error de red') } finally { setSending(false) }
  }

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.category === activeCategory)
  const tablesByZone = zoneOrder.map((z) => ({ zone: z, config: zoneConfig[z], tables: tables.filter((t) => t.zone === z) })).filter((g) => g.tables.length > 0)

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>

  if (view === 'menu' && selectedTable) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button variant="outline" size="sm" className="h-12" onClick={() => { setView('tables'); setSelectedTable(null) }}><ArrowLeft className="size-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-lg">{selectedTable.number}</div>
            <div><p className="font-bold text-lg">Mesa {selectedTable.number}</p><p className="text-xs text-muted-foreground">{zoneConfig[selectedTable.zone]?.label ?? selectedTable.zone}</p></div>
          </div>
          <div className="ml-auto"><Button variant="outline" size="sm" className="h-10" onClick={() => setShowClientSearch(!showClientSearch)}><UserCircle className="size-4 mr-1" />{selectedClientId ? clients.find((c) => c.id === selectedClientId)?.name ?? 'Cliente' : 'Cliente'}</Button></div>
        </div>
        {showClientSearch && (
          <div className="p-3 bg-amber-50 border-b">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por nombre o teléfono..." value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); searchClients(e.target.value) }} className="pl-9 h-12" /></div>
            {clients.length > 0 && <ScrollArea className="max-h-32 mt-2"><div className="space-y-1">{clients.slice(0, 5).map((c) => (<button key={c.id} className={`w-full text-left p-2 rounded-lg text-sm hover:bg-amber-100 transition-colors ${selectedClientId === c.id ? 'bg-amber-200' : ''}`} onClick={() => { setSelectedClientId(c.id); setShowClientSearch(false); setClientSearch('') }}><span className="font-medium">{c.name}</span><span className="text-muted-foreground ml-2">{c.phone}</span></button>))}</div></ScrollArea>}
            {selectedClientId && <div className="mt-2 flex items-center gap-2"><Badge className="bg-amber-600 text-white">{clients.find((c) => c.id === selectedClientId)?.name ?? 'Cliente'}</Badge><Button variant="ghost" size="sm" className="h-7" onClick={() => setSelectedClientId('')}><X className="size-3" /></Button></div>}
          </div>
        )}
        <div className="p-3 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar producto..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9 h-12" /></div></div>
        <div className="flex gap-1 p-3 overflow-x-auto border-b" style={{ scrollbarWidth: 'none' }}>
          {categoryOrder.map((cat) => { const cfg = categoryConfig[cat]; if (!cfg) return null; const count = products.filter((p) => p.category === cat).length; if (count === 0) return null; return <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} size="sm" className={`h-10 shrink-0 ${activeCategory === cat ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`} onClick={() => setActiveCategory(cat)}>{cfg.icon}<span className="ml-1">{cfg.label}</span></Button> })}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {filteredProducts.length === 0 ? <p className="text-center text-muted-foreground py-8">No hay productos en esta categoría</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => { const inOrder = currentOrderItems.find((i) => i.productId === product.id); return (<button key={product.id} className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 bg-white hover:bg-amber-50 hover:border-amber-400 transition-all min-h-[100px] active:scale-95" onClick={() => handleAddProduct(product)}>{inOrder && <div className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-bold shadow">{inOrder.quantity}</div>}<span className="font-semibold text-sm text-center leading-tight">{product.name}</span><span className="text-amber-700 font-bold mt-1">{formatEUR(product.price)}</span></button>) })}
            </div>
          )}
        </div>
        {currentOrderItems.length > 0 && (
          <div className="border-t bg-amber-50 p-3">
            <ScrollArea className="max-h-32 mb-2"><div className="space-y-1">{currentOrderItems.map((item) => (<div key={item.productId} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 flex-1 min-w-0"><span className="font-medium truncate">{item.name}</span></div><div className="flex items-center gap-1 shrink-0"><Button variant="outline" size="sm" className="size-8 p-0" onClick={() => updateOrderItemQuantity(item.productId, item.quantity - 1)}><Minus className="size-3" /></Button><span className="w-8 text-center font-bold">{item.quantity}</span><Button variant="outline" size="sm" className="size-8 p-0" onClick={() => updateOrderItemQuantity(item.productId, item.quantity + 1)}><Plus className="size-3" /></Button><span className="w-16 text-right font-semibold">{formatEUR(item.price * item.quantity)}</span><Button variant="ghost" size="sm" className="size-8 p-0 text-red-500 hover:text-red-700" onClick={() => removeOrderItem(item.productId)}><X className="size-3" /></Button></div></div>))}</div></ScrollArea>
            <div className="flex items-center justify-between pt-2 border-t"><div><span className="text-sm text-muted-foreground">{currentOrderItems.length} items</span><span className="ml-3 text-xl font-bold text-amber-800">{formatEUR(currentTotal)}</span></div><div className="flex gap-2"><Button variant="outline" className="h-12" onClick={() => clearOrderItems()}>Limpiar</Button><Button className="h-12 bg-amber-600 hover:bg-amber-700 text-white text-base font-bold px-6" onClick={handleEnviarCocina} disabled={sending}><Flame className="size-5 mr-2" />{sending ? 'Enviando...' : 'Enviar a Cocina'}</Button></div></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Camarero</h2><Button variant="outline" size="sm" className="h-10" onClick={fetchTables}><ShoppingCart className="size-4 mr-1" />Actualizar</Button></div>
      {tablesByZone.length === 0 ? <Card className="rounded-xl"><CardContent className="p-6"><p className="text-muted-foreground">No hay mesas configuradas.</p></CardContent></Card> : tablesByZone.map(({ zone, config: cfg, tables: zoneTables }) => (
        <div key={zone}><div className="flex items-center gap-2 mb-3">{cfg?.icon ?? <CircleDot className="size-4" />}<h3 className="font-semibold text-lg">{cfg?.label ?? zone}</h3><Badge variant="outline" className="text-xs">{zoneTables.length}</Badge></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {zoneTables.map((table) => { const isAvailable = table.status === 'available'; const isOccupied = table.status === 'occupied'; const isReserved = table.status === 'reserved'; return (<button key={table.id} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[100px] active:scale-95 ${isAvailable ? 'bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-500' : isOccupied ? 'bg-orange-50 border-orange-300 hover:bg-orange-100' : isReserved ? 'bg-amber-50 border-amber-300 hover:bg-amber-100' : 'bg-gray-50 border-gray-300'}`} onClick={() => handleSelectTable(table)}><span className="text-3xl font-bold">{table.number}</span><span className="text-xs mt-1">{isAvailable ? '🟢 Libre' : isOccupied ? '🔴 Ocupada' : isReserved ? '🟡 Reservada' : table.status}</span><span className="text-xs text-muted-foreground">{table.capacity} pax</span></button>) })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── COCINA TAB (KDS) ──────────────────────────────────────────────────────

function CocinaTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState<string | null>(null)
  const { authHeaders, handleFetchResponse } = useAuth()

  const fetchOrders = useCallback(async () => {
    try { const res = await fetch('/api/orders?status=pending,in_progress', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setOrders(json.orders) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchOrders(); const interval = setInterval(fetchOrders, 5000); return () => clearInterval(interval) }, [fetchOrders])

  const handleTerminar = async (order: Order) => {
    setFinishing(order.id)
    try {
      if (order.status === 'pending') { const preRes = await fetch(`/api/orders/${order.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: 'in_progress' }) }); handleFetchResponse(preRes) }
      const res = await fetch(`/api/orders/${order.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: 'ready' }) })
      if (handleFetchResponse(res) && res.ok) { toast.success(`Mesa ${order.table?.number ?? '?'} — Pedido listo`); setOrders((prev) => prev.filter((o) => o.id !== order.id)) }
      else { const err = await res.json(); toast.error(err.error || 'Error al actualizar pedido') }
    } catch { toast.error('Error de red') } finally { setFinishing(null) }
  }

  const sortedOrders = [...orders].sort((a, b) => { if (a.status === 'pending' && b.status !== 'pending') return -1; if (a.status !== 'pending' && b.status === 'pending') return 1; return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() })

  if (loading) return <div className="bg-gray-900 rounded-xl p-6 min-h-[60vh] flex items-center justify-center"><div className="flex items-center gap-3 text-gray-400"><ChefHat className="size-8 animate-pulse" /><span className="text-xl">Cargando pedidos...</span></div></div>

  return (
    <div className="bg-gray-900 rounded-xl p-4 min-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><ChefHat className="size-8 text-amber-400" /><h2 className="text-2xl font-bold text-white">Cocina</h2><Badge className="bg-amber-600 text-white text-sm">{orders.length} pedidos</Badge></div><Button variant="outline" className="h-10 border-gray-600 text-gray-300 hover:bg-gray-800" onClick={fetchOrders}><ShoppingCart className="size-4 mr-1" />Actualizar</Button></div>
      {sortedOrders.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-500"><CheckCheck className="size-16 mb-4" /><p className="text-xl font-medium">¡Todo listo!</p><p className="text-sm mt-1">No hay pedidos pendientes</p></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map((order) => (
            <div key={order.id} className={`bg-gray-800 rounded-xl p-4 border-l-4 transition-all ${order.status === 'pending' ? 'border-l-amber-500' : 'border-l-orange-500'} ${finishing === order.id ? 'opacity-50 scale-95' : ''}`}>
              <div className="flex items-start justify-between mb-3"><div><p className="text-3xl font-bold text-white">Mesa {order.table?.number ?? '?'}</p><p className="text-sm text-gray-400">{zoneConfig[order.table?.zone]?.label ?? order.table?.zone}</p></div><div className="text-right"><p className="text-sm text-gray-400">{formatTime(order.createdAt)}</p><p className={`text-lg font-bold ${elapsedColor(order.createdAt)}`}><Timer className="size-4 inline mr-1" />{timeAgo(order.createdAt)}</p></div></div>
              <Badge className={`mb-3 ${order.status === 'pending' ? 'bg-amber-600/20 text-amber-400 border-amber-600/30' : 'bg-orange-600/20 text-orange-400 border-orange-600/30'}`} variant="outline">{order.status === 'pending' ? '⏳ Pendiente' : '🔥 En preparación'}</Badge>
              <div className="space-y-1 mb-4">{order.items.map((item) => (<div key={item.id} className="flex items-start gap-2 text-white"><span className="flex size-6 items-center justify-center rounded bg-amber-600/30 text-amber-300 text-xs font-bold shrink-0">{item.quantity}</span><span className="text-sm leading-tight">{item.product?.name ?? 'Producto'}</span>{item.notes && <span className="text-xs text-amber-400 ml-1">({item.notes})</span>}</div>))}</div>
              {order.client && <p className="text-xs text-gray-500 mb-3"><UserCircle className="size-3 inline mr-1" />{order.client.name}</p>}
              <div className="flex gap-2"><Button variant="outline" size="sm" className="h-14 border-gray-600 text-white hover:bg-gray-700" onClick={() => handlePrintTicket('kitchen', order.id, authHeaders)}><Printer className="size-5 mr-1" />Cocina</Button><Button variant="outline" size="sm" className="h-14 border-gray-600 text-white hover:bg-gray-700" onClick={() => handlePrintTicket('bar', order.id, authHeaders)}><Wine className="size-5 mr-1" />Barra</Button></div>
              <Button className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => handleTerminar(order)} disabled={finishing === order.id}><CheckCircle className="size-6 mr-2" />TERMINAR</Button>
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const { authHeaders, handleFetchResponse } = useAuth()
  const [cashSession, setCashSession] = useState<any>(null)
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false)
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false)
  const [openingCashInput, setOpeningCashInput] = useState('')
  const [closingCashInput, setClosingCashInput] = useState('')
  const [cashSessionLoading, setCashSessionLoading] = useState(false)
  const [cashCloseSummary, setCashCloseSummary] = useState<any>(null)

  const fetchTables = useCallback(async () => { try { const res = await fetch('/api/tables', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setTables(json.tables.filter((t: TableItem) => t.active)) } } catch { /* */ } }, [authHeaders, handleFetchResponse])
  const fetchActiveOrders = useCallback(async () => { try { const res = await fetch('/api/orders?status=pending,in_progress,ready,served', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setOrders(json.orders) } } catch { /* */ } finally { setLoading(false) } }, [authHeaders, handleFetchResponse])
  const fetchCashSession = useCallback(async () => { try { const res = await fetch('/api/cash-sessions?current=true', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); if (json.sessions?.length > 0) setCashSession(json.sessions[0]); else if (json.cashSession) setCashSession(json.cashSession); else setCashSession(null) } } catch { /* */ } }, [authHeaders, handleFetchResponse])

  useEffect(() => { const load = async () => { await Promise.all([fetchTables(), fetchActiveOrders(), fetchCashSession()]); setLoading(false) }; load(); const interval = setInterval(() => { fetchTables(); fetchActiveOrders() }, 8000); return () => clearInterval(interval) }, [fetchTables, fetchActiveOrders, fetchCashSession])

  const getTableOrders = (tableId: string) => orders.filter((o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status))
  const selectedTableId = payingTable
  const selectedTable = tables.find((t) => t.id === selectedTableId)
  const selectedOrders = selectedTableId ? getTableOrders(selectedTableId) : []
  const allItems = selectedOrders.flatMap((o) => o.items)
  const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0)
  const bebidasTotal = allItems.filter((i) => i.product?.category === 'bebida').reduce((s, i) => s + i.quantity, 0)
  const freeDrinks = Math.floor(bebidasTotal / 5)
  const discount = freeDrinks * 1.50
  const hasClient = selectedOrders.some((o) => o.clientId !== null)
  const finalDiscount = hasClient ? discount : 0
  const total = Math.max(0, subtotal - finalDiscount)
  const pointsEarned = Math.floor(total)
  const clientInfo = selectedOrders.find((o) => o.client)?.client

  const handleCobrar = async () => {
    if (!selectedTableId || selectedOrders.length === 0) return
    if (!cashSession) { toast.error('Abre caja para poder cobrar'); return }
    setPaying(true)
    try {
      for (const order of selectedOrders) {
        const res = await fetch(`/api/orders/${order.id}/pay`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ applyDiscount: true, paymentMethod: selectedPaymentMethod }) })
        if (!handleFetchResponse(res) || !res.ok) { const err = await res.json(); toast.error(err.error || 'Error al cobrar pedido'); setPaying(false); return }
      }
      toast.success(`Mesa ${selectedTable?.number ?? '?'} cobrada — ${formatEUR(total)}`); setPayingTable(null); fetchTables(); fetchActiveOrders()
    } catch { toast.error('Error de red') } finally { setPaying(false) }
  }

  const handleOpenCash = async () => { setCashSessionLoading(true); try { const res = await fetch('/api/cash-sessions', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ openingCash: parseFloat(openingCashInput) || 0 }) }); if (res.ok) { toast.success('Caja abierta'); setShowOpenCashDialog(false); setOpeningCashInput(''); fetchCashSession() } else { const err = await res.json(); toast.error(err.error || 'Error al abrir caja') } } catch { toast.error('Error de red') } finally { setCashSessionLoading(false) } }
  const handleCloseCash = async () => { setCashSessionLoading(true); try { const res = await fetch(`/api/cash-sessions/${cashSession.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ closingCash: parseFloat(closingCashInput) || 0 }) }); if (res.ok) { const json = await res.json(); setCashCloseSummary(json.cashSession); toast.success('Caja cerrada'); fetchCashSession() } else { const err = await res.json(); toast.error(err.error || 'Error al cerrar caja') } } catch { toast.error('Error de red') } finally { setCashSessionLoading(false) } }

  const tablesByZone = zoneOrder.map((z) => ({ zone: z, config: zoneConfig[z], tables: tables.filter((t) => t.zone === z) })).filter((g) => g.tables.length > 0)

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>

  if (selectedTableId && selectedTable) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Button variant="outline" size="sm" className="h-12" onClick={() => setPayingTable(null)}><ArrowLeft className="size-5" /></Button><h2 className="text-2xl font-bold">Mesa {selectedTable.number}</h2><span className="text-muted-foreground">{zoneConfig[selectedTable.zone]?.label ?? selectedTable.zone}</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-xl"><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Receipt className="size-5" />Pedidos activos ({selectedOrders.length})</CardTitle></CardHeader><CardContent><ScrollArea className="max-h-96">{selectedOrders.length === 0 ? <p className="text-muted-foreground text-sm">No hay pedidos activos</p> : <div className="space-y-4">{selectedOrders.map((order) => (<div key={order.id} className="border rounded-lg p-3"><div className="flex items-center justify-between mb-2"><Badge variant="outline" className={order.status === 'ready' ? 'bg-green-100 text-green-800 border-green-200' : order.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-orange-100 text-orange-800 border-orange-200'}>{order.status === 'ready' ? '✅ Listo' : order.status === 'pending' ? '⏳ Pendiente' : '🔥 En curso'}</Badge><span className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</span></div><div className="space-y-1">{order.items.map((item) => (<div key={item.id} className="flex justify-between text-sm"><span><span className="font-medium">{item.quantity}x</span> {item.product?.name ?? 'Producto'}</span><span className="text-muted-foreground">{formatEUR(item.subtotal)}</span></div>))}</div>{order.client && <p className="text-xs text-muted-foreground mt-2"><UserCircle className="size-3 inline mr-1" />{order.client.name} · {order.client.phone}</p>}</div>))}</div>}</ScrollArea></CardContent></Card>
          <Card className="rounded-xl"><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="size-5" />Cuenta</CardTitle></CardHeader><CardContent className="space-y-4">
            {clientInfo && <div className="bg-amber-50 rounded-lg p-3"><div className="flex items-center gap-2"><UserCircle className="size-5 text-amber-600" /><span className="font-semibold">{clientInfo.name}</span></div><div className="flex gap-4 mt-1 text-sm text-muted-foreground"><span><Phone className="size-3 inline mr-1" />{clientInfo.phone}</span>{clientInfo.points !== undefined && <span><Star className="size-3 inline mr-1" />{clientInfo.points} pts</span>}</div></div>}
            <div className="space-y-2"><div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatEUR(subtotal)}</span></div>
              {hasClient && freeDrinks > 0 && <div className="flex justify-between text-sm text-green-700"><span><Beer className="size-3 inline mr-1" />5ª GRATIS: {freeDrinks} bebida{freeDrinks > 1 ? 's' : ''} gratis</span><span>-{formatEUR(finalDiscount)}</span></div>}
              <Separator /><div className="flex justify-between text-xl font-bold"><span>Total</span><span className="text-amber-700">{formatEUR(total)}</span></div>
              {pointsEarned > 0 && <div className="text-sm text-muted-foreground"><Star className="size-3 inline mr-1" />Puntos a ganar: <span className="font-semibold text-amber-700">{pointsEarned}</span></div>}
            </div>
            <div className="flex gap-2"><Button variant={selectedPaymentMethod === 'efectivo' ? 'default' : 'outline'} className={`flex-1 h-12 ${selectedPaymentMethod === 'efectivo' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`} onClick={() => setSelectedPaymentMethod('efectivo')}><Euro className="size-5 mr-2" />Efectivo</Button><Button variant={selectedPaymentMethod === 'tarjeta' ? 'default' : 'outline'} className={`flex-1 h-12 ${selectedPaymentMethod === 'tarjeta' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`} onClick={() => setSelectedPaymentMethod('tarjeta')}><CreditCard className="size-5 mr-2" />Tarjeta</Button></div>
            <Button className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white" onClick={handleCobrar} disabled={paying || selectedOrders.length === 0 || !cashSession}><Euro className="size-6 mr-2" />{paying ? 'Cobrando...' : 'COBRAR'}</Button>
            {!cashSession && <p className="text-sm text-red-600 text-center font-medium mt-1">Abre caja para poder cobrar</p>}
            <Button variant="outline" className="w-full h-12 mt-2" onClick={() => { if (selectedOrders.length > 0) handlePrintTicket('receipt', selectedOrders[0].id, authHeaders) }}><Printer className="size-5 mr-2" />Imprimir Recibo</Button>
          </CardContent></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-2 border-amber-200 bg-amber-50/50"><CardContent className="p-4">
        {!cashSession ? <div className="flex items-center justify-between"><div><h3 className="font-bold text-lg flex items-center gap-2"><Lock className="size-5 text-red-600" />Caja Cerrada</h3><p className="text-sm text-muted-foreground">Debes abrir caja para poder cobrar</p></div><Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowOpenCashDialog(true)}>Abrir Caja</Button></div>
        : <div className="flex items-center justify-between"><div><h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle className="size-5 text-green-600" />Caja Abierta</h3><p className="text-sm text-muted-foreground">Apertura: {formatEUR(cashSession.openingCash)} · Iniciada: {formatTime(cashSession.openedAt)}</p></div><Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setShowCloseCashDialog(true)}>Cerrar Caja</Button></div>}
      </CardContent></Card>
      {tablesByZone.map(({ zone, config: cfg, tables: zoneTables }) => (
        <div key={zone}><div className="flex items-center gap-2 mb-3">{cfg?.icon}<h3 className="font-semibold text-lg">{cfg?.label ?? zone}</h3><Badge variant="outline" className="text-xs">{zoneTables.length}</Badge></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {zoneTables.map((table) => { const tableOrders = getTableOrders(table.id); const hasReady = tableOrders.some((o) => o.status === 'ready'); const hasActive = tableOrders.length > 0; return (<button key={table.id} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[100px] active:scale-95 ${!hasActive ? 'bg-green-50 border-green-300 hover:bg-green-100' : hasReady ? 'bg-blue-50 border-blue-400 hover:bg-blue-100' : 'bg-orange-50 border-orange-300 hover:bg-orange-100'}`} onClick={() => setPayingTable(table.id)}><span className="text-3xl font-bold">{table.number}</span><span className="text-xs mt-1">{!hasActive ? '🟢 Libre' : hasReady ? '💳 Cobrar' : `🍽️ ${tableOrders.length} pedidos`}</span><span className="text-xs text-muted-foreground">{table.capacity} pax</span></button>) })}
          </div>
        </div>
      ))}
      {/* Cash dialogs */}
      <Dialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}><DialogContent><DialogHeader><DialogTitle>Abrir Caja</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Dinero inicial en caja</Label><Input type="number" step="0.01" placeholder="0.00" value={openingCashInput} onChange={(e) => setOpeningCashInput(e.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowOpenCashDialog(false)}>Cancelar</Button><Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleOpenCash} disabled={cashSessionLoading}>{cashSessionLoading ? 'Abriendo...' : 'Abrir Caja'}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showCloseCashDialog} onOpenChange={setShowCloseCashDialog}><DialogContent><DialogHeader><DialogTitle>Cerrar Caja</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Dinero contado al cierre</Label><Input type="number" step="0.01" placeholder="0.00" value={closingCashInput} onChange={(e) => setClosingCashInput(e.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCloseCashDialog(false)}>Cancelar</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCloseCash} disabled={cashSessionLoading}>{cashSessionLoading ? 'Cerrando...' : 'Cerrar Caja'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}

// ─── REPORTES TAB ───────────────────────────────────────────────────────────

function ReportesTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [reportType, setReportType] = useState<'daily_sales' | 'payment_methods' | 'top_products' | 'cancelled_orders' | 'cash_closes'>('daily_sales')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: reportType })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/reports?${params}`, { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setReportData(json) }
    } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse, reportType, dateFrom, dateTo])

  const reportTypes = [
    { value: 'daily_sales' as const, label: 'Ventas del día' }, { value: 'payment_methods' as const, label: 'Por método de pago' },
    { value: 'top_products' as const, label: 'Productos más vendidos' }, { value: 'cancelled_orders' as const, label: 'Pedidos cancelados' }, { value: 'cash_closes' as const, label: 'Cierres de caja' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Reportes</h2><Button variant="outline" size="sm" className="h-10" onClick={fetchReport} disabled={loading}><BarChart3 className="size-4 mr-1" />{loading ? 'Cargando...' : 'Actualizar'}</Button></div>
      <Card className="rounded-xl"><CardContent className="p-4 space-y-4"><div className="flex flex-wrap gap-2">{reportTypes.map((rt) => (<Button key={rt.value} variant={reportType === rt.value ? 'default' : 'outline'} size="sm" className={reportType === rt.value ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''} onClick={() => { setReportType(rt.value); setReportData(null) }}>{rt.label}</Button>))}</div><div className="flex gap-3 items-end"><div className="space-y-1"><Label className="text-xs">Desde</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div><div className="space-y-1"><Label className="text-xs">Hasta</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div></div></CardContent></Card>
      {loading ? <div className="grid gap-4"><Skeleton className="h-40 rounded-xl" /></div> : !reportData ? <Card className="rounded-xl"><CardContent className="p-6"><p className="text-muted-foreground text-center">Selecciona un reporte y haz clic en Actualizar</p></CardContent></Card> : (
        <>
          {reportType === 'daily_sales' && <Card className="rounded-xl"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5" />Ventas del día</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-4 mb-4"><div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-sm text-muted-foreground">Ingresos</p><p className="text-2xl font-bold text-amber-700">{formatEUR(reportData.totalRevenue ?? 0)}</p></div><div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-sm text-muted-foreground">Pedidos</p><p className="text-2xl font-bold text-amber-700">{reportData.totalOrders ?? 0}</p></div><div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-sm text-muted-foreground">Ticket medio</p><p className="text-2xl font-bold text-amber-700">{formatEUR(reportData.avgTicket ?? 0)}</p></div></div></CardContent></Card>}
          {reportType === 'payment_methods' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Card className="rounded-xl"><CardContent className="p-6 text-center"><Euro className="size-10 mx-auto mb-2 text-green-600" /><p className="text-sm text-muted-foreground">Efectivo</p><p className="text-3xl font-bold text-green-700">{formatEUR(reportData.efectivo?.total ?? 0)}</p></CardContent></Card><Card className="rounded-xl"><CardContent className="p-6 text-center"><CreditCard className="size-10 mx-auto mb-2 text-blue-600" /><p className="text-sm text-muted-foreground">Tarjeta</p><p className="text-3xl font-bold text-blue-700">{formatEUR(reportData.tarjeta?.total ?? 0)}</p></CardContent></Card></div>}
          {reportType === 'top_products' && <Card className="rounded-xl"><CardHeader><CardTitle className="flex items-center gap-2"><Star className="size-5" />Productos más vendidos</CardTitle></CardHeader><CardContent>{reportData.products?.length > 0 ? <div className="space-y-2">{reportData.products.map((p: any, i: number) => (<div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-bold">{i + 1}</span><div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.quantity} unidades</p></div></div><span className="font-bold text-amber-700">{formatEUR(p.revenue)}</span></div>))}</div> : <p className="text-muted-foreground text-center py-8">No hay datos</p>}</CardContent></Card>}
          {reportType === 'cancelled_orders' && <Card className="rounded-xl"><CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="size-5 text-red-500" />Pedidos cancelados</CardTitle></CardHeader><CardContent><div className="mb-4 p-3 bg-red-50 rounded-lg text-center"><p className="text-sm text-muted-foreground">Ingresos perdidos</p><p className="text-2xl font-bold text-red-700">{formatEUR(reportData.totalLost ?? reportData.lostRevenue ?? 0)}</p></div></CardContent></Card>}
          {reportType === 'cash_closes' && <Card className="rounded-xl"><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="size-5" />Cierres de caja</CardTitle></CardHeader><CardContent>{reportData.sessions?.length > 0 ? <ScrollArea className="max-h-96"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">Apertura</th><th className="text-right p-2">Ventas</th><th className="text-right p-2">Diferencia</th></tr></thead><tbody>{reportData.sessions.map((s: any) => (<tr key={s.id} className="border-b"><td className="p-2">{s.openedAt ? new Date(s.openedAt).toLocaleString('es-ES') : '-'}</td><td className="text-right p-2">{formatEUR(s.totalSales ?? 0)}</td><td className={`text-right p-2 font-semibold ${(s.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.difference != null ? formatEUR(s.difference) : '-'}</td></tr>))}</tbody></table></ScrollArea> : <p className="text-muted-foreground text-center py-8">No hay cierres de caja</p>}</CardContent></Card>}
        </>
      )}
    </div>
  )
}

// ─── RESTAURANTES TAB (super_admin) ────────────────────────────────────────

function RestaurantesTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const { setSelectedRestaurantId, setActiveTab } = useRestaurantStore()
  const [restaurants, setRestaurants] = useState<RestaurantInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ restaurantName: '', slug: '', address: '', phone: '', adminName: '', adminUsername: '', adminPassword: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const fetchRestaurants = useCallback(async () => {
    try { const res = await fetch('/api/restaurants', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setRestaurants(json.restaurants) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchRestaurants() }, [fetchRestaurants])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.restaurantName.trim()) errors.restaurantName = 'Nombre del restaurante obligatorio'
    if (!form.slug.trim()) errors.slug = 'Slug obligatorio'
    if (!form.adminName.trim()) errors.adminName = 'Nombre del admin obligatorio'
    if (!form.adminUsername.trim()) errors.adminUsername = 'Username del admin obligatorio'
    if (form.adminUsername.length > 0 && form.adminUsername.length < 3) errors.adminUsername = 'Mínimo 3 caracteres'
    if (!form.adminPassword.trim()) errors.adminPassword = 'Contraseña del admin obligatoria'
    if (form.adminPassword.length > 0 && form.adminPassword.length < 6) errors.adminPassword = 'Mínimo 6 caracteres'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    setCreating(true)
    try {
      const res = await fetch('/api/onboarding', { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) })
      if (res.ok) { toast.success('Restaurante creado correctamente'); setShowCreateDialog(false); setForm({ restaurantName: '', slug: '', address: '', phone: '', adminName: '', adminUsername: '', adminPassword: '' }); setFormErrors({}); fetchRestaurants() }
      else { const err = await res.json(); toast.error(err.error || 'Error al crear restaurante') }
    } catch { toast.error('Error de red') } finally { setCreating(false) }
  }

  const handleToggleRestaurant = async (r: RestaurantInfo) => {
    try {
      const res = await fetch('/api/restaurants', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id: r.id, active: !r.active }) })
      if (res.ok) { toast.success(r.active ? 'Restaurante bloqueado' : 'Restaurante desbloqueado'); fetchRestaurants() }
      else { const err = await res.json(); toast.error(err.error || 'Error') }
    } catch { toast.error('Error de red') }
  }

  const handleToggleAdmin = async (u: { id: string; active: boolean }) => {
    try {
      const res = await fetch('/api/users', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id: u.id, active: !u.active }) })
      if (res.ok) { toast.success(u.active ? 'Admin bloqueado' : 'Admin desbloqueado'); fetchRestaurants() }
      else { const err = await res.json(); toast.error(err.error || 'Error') }
    } catch { toast.error('Error de red') }
  }

  const handleViewRestaurant = (r: RestaurantInfo) => {
    setSelectedRestaurantId(r.id)
    setActiveTab('dashboard')
  }

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Restaurantes</h2>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}><Plus className="size-4 mr-1" />Crear Restaurante</Button>
      </div>

      {restaurants.length === 0 ? <Card className="rounded-xl"><CardContent className="p-6 text-center"><Building2 className="size-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground">No hay restaurantes creados</p><Button className="mt-4 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}><Plus className="size-4 mr-1" />Crear Restaurante</Button></CardContent></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => {
            const admin = r.users?.[0]
            const subCfg = subStatusConfig[r.subscriptionStatus] ?? subStatusConfig.trial
            return (
              <Card key={r.id} className={`rounded-xl ${!r.active ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div><CardTitle className="text-lg">{r.name}</CardTitle><p className="text-xs text-muted-foreground mt-1">/{r.slug}</p></div>
                    <Badge className={subCfg.color}>{subCfg.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.address && <p className="text-sm text-muted-foreground">{r.address}</p>}
                  {r.phone && <p className="text-sm text-muted-foreground"><Phone className="size-3 inline mr-1" />{r.phone}</p>}
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground"><Users className="size-3 inline mr-1" />{r._count?.users ?? 0} users</span>
                    <span className="text-muted-foreground"><UtensilsCrossed className="size-3 inline mr-1" />{r._count?.tables ?? 0} mesas</span>
                    <span className="text-muted-foreground"><Package className="size-3 inline mr-1" />{r._count?.products ?? 0} prod</span>
                  </div>
                  {admin && <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2"><div className="flex items-center gap-2"><Shield className="size-4 text-amber-600" /><div><p className="text-sm font-medium">{admin.name || admin.username}</p><Badge variant="outline" className={`text-xs ${admin.active ? 'text-green-700' : 'text-red-700'}`}>{admin.active ? 'Activo' : 'Bloqueado'}</Badge></div></div><Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleToggleAdmin(admin)} title={admin.active ? 'Bloquear admin' : 'Desbloquear admin'}><Ban className="size-4 text-red-500" /></Button></div>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewRestaurant(r)}><Eye className="size-4 mr-1" />Ver</Button>
                    <Button variant="outline" size="sm" className={r.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} onClick={() => handleToggleRestaurant(r)}>{r.active ? <><Ban className="size-4 mr-1" />Bloquear</> : <><CheckCircle className="size-4 mr-1" />Activar</>}</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Restaurant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Crear Restaurante</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nombre del Restaurante *</Label><Input placeholder="Ej: La Carta de Sevilla" value={form.restaurantName} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, restaurantName: v, slug: slugify(v) })) }} />{formErrors.restaurantName && <p className="text-xs text-red-600">{formErrors.restaurantName}</p>}</div>
            <div className="space-y-2"><Label>Slug *</Label><Input placeholder="la-carta-de-sevilla" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />{formErrors.slug && <p className="text-xs text-red-600">{formErrors.slug}</p>}</div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Dirección</Label><Input placeholder="C/ Ejemplo 1" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div><div className="space-y-2"><Label>Teléfono</Label><Input placeholder="954000000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div></div>
            <Separator />
            <p className="text-sm font-semibold text-amber-700">Administrador</p>
            <div className="space-y-2"><Label>Nombre del Admin *</Label><Input placeholder="Juan García" value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} />{formErrors.adminName && <p className="text-xs text-red-600">{formErrors.adminName}</p>}</div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Username *</Label><Input placeholder="admin" value={form.adminUsername} onChange={(e) => setForm((f) => ({ ...f, adminUsername: e.target.value }))} />{formErrors.adminUsername && <p className="text-xs text-red-600">{formErrors.adminUsername}</p>}</div><div className="space-y-2"><Label>Contraseña *</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))} />{formErrors.adminPassword && <p className="text-xs text-red-600">{formErrors.adminPassword}</p>}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreate} disabled={creating}>{creating ? 'Creando...' : 'Crear Restaurante'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── USERS TAB ──────────────────────────────────────────────────────────────

function UsersTab() {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetUserId, setResetUserId] = useState<string>('')
  const [resetPassword, setResetPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'camarero' as string, zone: '' as string })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const fetchUsers = useCallback(async () => {
    try { const res = await fetch('/api/users', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setUsers(json.users) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.username.trim() || form.username.length < 3) errors.username = 'Mínimo 3 caracteres'
    if (!form.password.trim() || form.password.length < 6) errors.password = 'Mínimo 6 caracteres'
    if (!form.name.trim()) errors.name = 'Nombre obligatorio'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    setCreating(true)
    try {
      const body: any = { username: form.username, password: form.password, name: form.name, role: form.role, mustChangePassword: true }
      if (form.role === 'camarero' && form.zone) body.zone = form.zone
      const res = await fetch('/api/users', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
      if (res.ok) { toast.success('Usuario creado'); setShowCreateDialog(false); setForm({ username: '', password: '', name: '', role: 'camarero', zone: '' }); setFormErrors({}); fetchUsers() }
      else { const err = await res.json(); toast.error(err.error || 'Error al crear usuario') }
    } catch { toast.error('Error de red') } finally { setCreating(false) }
  }

  const handleToggleActive = async (u: UserInfo) => {
    try {
      const res = await fetch('/api/users', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id: u.id, active: !u.active }) })
      if (res.ok) { toast.success(u.active ? 'Usuario desactivado' : 'Usuario activado'); fetchUsers() }
      else { const err = await res.json(); toast.error(err.error || 'Error') }
    } catch { toast.error('Error de red') }
  }

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${resetUserId}/reset-password`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ newPassword: resetPassword }) })
      if (res.ok) { toast.success('Contraseña reseteada'); setShowResetDialog(false); setResetPassword('') }
      else { const err = await res.json(); toast.error(err.error || 'Error') }
    } catch { toast.error('Error de red') } finally { setResetting(false) }
  }

  if (loading) return <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Usuarios</h2><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}><UserPlus className="size-4 mr-1" />Crear Usuario</Button></div>
      <Card className="rounded-xl"><CardContent className="p-0">
        <ScrollArea className="max-h-[70vh]">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Usuario</th><th className="text-left p-3">Nombre</th><th className="text-left p-3">Rol</th><th className="text-left p-3">Zona</th><th className="text-left p-3">Estado</th><th className="text-right p-3">Acciones</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-b hover:bg-muted/30 ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{roleLabels[u.role] ?? u.role}</Badge></td>
                  <td className="p-3">{u.zone ? <Badge variant="outline" className="text-xs">{zoneConfig[u.zone]?.label ?? u.zone}</Badge> : '-'}</td>
                  <td className="p-3"><Badge className={u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{u.active ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="p-3 text-right"><div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleToggleActive(u)} title={u.active ? 'Desactivar' : 'Activar'}>{u.active ? <Ban className="size-4 text-red-500" /> : <CheckCircle className="size-4 text-green-500" />}</Button>
                    <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => { setResetUserId(u.id); setShowResetDialog(true) }} title="Resetear contraseña"><RotateCcw className="size-4 text-amber-500" /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent></Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent><DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Username *</Label><Input placeholder="usuario" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />{formErrors.username && <p className="text-xs text-red-600">{formErrors.username}</p>}</div><div className="space-y-2"><Label>Contraseña *</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />{formErrors.password && <p className="text-xs text-red-600">{formErrors.password}</p>}</div></div>
            <div className="space-y-2"><Label>Nombre *</Label><Input placeholder="Nombre completo" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />{formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Rol</Label><Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v, zone: v !== 'camarero' ? '' : f.zone }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="camarero">Camarero</SelectItem><SelectItem value="cocina">Cocinero</SelectItem><SelectItem value="caja">Caja</SelectItem><SelectItem value="encargado">Encargado</SelectItem></SelectContent></Select></div>
              {form.role === 'camarero' && <div className="space-y-2"><Label>Zona</Label><Select value={form.zone} onValueChange={(v) => setForm((f) => ({ ...f, zone: v }))}><SelectTrigger><SelectValue placeholder="Sin zona" /></SelectTrigger><SelectContent><SelectItem value="terrace">Terraza</SelectItem><SelectItem value="main">Salón</SelectItem><SelectItem value="bar">Barra</SelectItem></SelectContent></Select></div>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreate} disabled={creating}>{creating ? 'Creando...' : 'Crear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent><DialogHeader><DialogTitle>Resetear Contraseña</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2"><div className="space-y-2"><Label>Nueva Contraseña</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancelar</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleResetPassword} disabled={resetting}>{resetting ? 'Reseteando...' : 'Resetear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── TABLES TAB (enhanced with zone config) ─────────────────────────────────

function TablesTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [tables, setTables] = useState<TableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const [createForm, setCreateForm] = useState({ number: '', capacity: '4', zone: 'main' })
  const [configForm, setConfigForm] = useState({ terrace: '', main: '', bar: '', capacity: '4' })

  const fetchTables = useCallback(async () => {
    try { const res = await fetch('/api/tables', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setTables(json.tables.filter((t: TableItem) => t.active)) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchTables() }, [fetchTables])

  const handleCreate = async () => {
    const num = parseInt(createForm.number)
    if (!num || num < 1) { toast.error('Número de mesa obligatorio'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/tables', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ number: num, capacity: parseInt(createForm.capacity) || 4, zone: createForm.zone }) })
      if (res.ok) { toast.success('Mesa creada'); setShowCreateDialog(false); setCreateForm({ number: '', capacity: '4', zone: 'main' }); fetchTables() }
      else { const err = await res.json(); toast.error(err.error || 'Error al crear mesa') }
    } catch { toast.error('Error de red') } finally { setCreating(false) }
  }

  const handleBatchCreate = async () => {
    const terrace = parseInt(configForm.terrace) || 0
    const main = parseInt(configForm.main) || 0
    const bar = parseInt(configForm.bar) || 0
    const capacity = parseInt(configForm.capacity) || 4
    if (terrace + main + bar === 0) { toast.error('Indica al menos una mesa'); return }
    setConfiguring(true)
    try {
      const createForZone = async (zone: string, count: number, startNum: number) => {
        for (let i = 0; i < count; i++) {
          const res = await fetch('/api/tables', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ number: startNum + i, capacity, zone }) })
          if (!res.ok) { const err = await res.json(); toast.error(err.error || `Error mesa ${startNum + i}`) }
        }
      }
      let nextNum = 1
      if (bar > 0) { await createForZone('bar', bar, nextNum); nextNum += bar }
      if (main > 0) { await createForZone('main', main, nextNum); nextNum += main }
      if (terrace > 0) { await createForZone('terrace', terrace, nextNum); nextNum += terrace }
      toast.success('Mesas configuradas')
      setShowConfigDialog(false)
      setConfigForm({ terrace: '', main: '', bar: '', capacity: '4' })
      fetchTables()
    } catch { toast.error('Error de red') } finally { setConfiguring(false) }
  }

  const tablesByZone = zoneOrder.map((z) => ({ zone: z, config: zoneConfig[z], tables: tables.filter((t) => t.zone === z) }))

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Mesas</h2><div className="flex gap-2"><Button variant="outline" onClick={() => setShowConfigDialog(true)}><Settings className="size-4 mr-1" />Configurar</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}><Plus className="size-4 mr-1" />Nueva Mesa</Button></div></div>

      {tables.length === 0 ? <Card className="rounded-xl"><CardContent className="p-6 text-center"><UtensilsCrossed className="size-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground mb-4">No hay mesas configuradas</p><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowConfigDialog(true)}><Settings className="size-4 mr-1" />Configurar Mesas</Button></CardContent></Card> : tablesByZone.map(({ zone, config: cfg, tables: zoneTables }) => (
        <div key={zone}><div className="flex items-center gap-2 mb-3">{cfg?.icon}<h3 className="font-semibold text-lg">{cfg?.label ?? zone}</h3><Badge variant="outline" className="text-xs">{zoneTables.length} mesas</Badge></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {zoneTables.map((table) => { const isAvailable = table.status === 'available'; return (<div key={table.id} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 min-h-[80px] ${isAvailable ? 'bg-green-50 border-green-300' : table.status === 'occupied' ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-300'}`}><span className="text-2xl font-bold">{table.number}</span><span className="text-xs text-muted-foreground">{table.capacity} pax</span></div>) })}
          </div>
        </div>
      ))}

      {/* Create Single Table Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent><DialogHeader><DialogTitle>Nueva Mesa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Número</Label><Input type="number" placeholder="1" value={createForm.number} onChange={(e) => setCreateForm((f) => ({ ...f, number: e.target.value }))} /></div><div className="space-y-2"><Label>Capacidad</Label><Input type="number" placeholder="4" value={createForm.capacity} onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))} /></div></div>
            <div className="space-y-2"><Label>Zona</Label><Select value={createForm.zone} onValueChange={(v) => setCreateForm((f) => ({ ...f, zone: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="terrace">Terraza</SelectItem><SelectItem value="main">Salón</SelectItem><SelectItem value="bar">Barra</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreate} disabled={creating}>{creating ? 'Creando...' : 'Crear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent><DialogHeader><DialogTitle>Configurar Mesas</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Crea mesas en lote indicando la cantidad por zona. Las mesas ya existentes no se duplicarán.</p>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label><Sun className="size-3 inline mr-1" />Terraza</Label><Input type="number" placeholder="0" value={configForm.terrace} onChange={(e) => setConfigForm((f) => ({ ...f, terrace: e.target.value }))} /></div>
              <div className="space-y-2"><Label><Utensils className="size-3 inline mr-1" />Salón</Label><Input type="number" placeholder="0" value={configForm.main} onChange={(e) => setConfigForm((f) => ({ ...f, main: e.target.value }))} /></div>
              <div className="space-y-2"><Label><Wine className="size-3 inline mr-1" />Barra</Label><Input type="number" placeholder="0" value={configForm.bar} onChange={(e) => setConfigForm((f) => ({ ...f, bar: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Capacidad por defecto (sillas)</Label><Input type="number" placeholder="4" value={configForm.capacity} onChange={(e) => setConfigForm((f) => ({ ...f, capacity: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancelar</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleBatchCreate} disabled={configuring}>{configuring ? 'Creando...' : 'Crear Mesas'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── AUDIT TAB ──────────────────────────────────────────────────────────────

function AuditTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try { const res = await fetch('/api/audit-logs', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setLogs(json.logs ?? []) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  if (loading) return <div className="grid gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Auditoría</h2><Button variant="outline" size="sm" className="h-10" onClick={fetchLogs}><ClipboardList className="size-4 mr-1" />Actualizar</Button></div>
      {logs.length === 0 ? <Card className="rounded-xl"><CardContent className="p-6"><p className="text-muted-foreground text-center">No hay registros de auditoría</p></CardContent></Card> : (
        <Card className="rounded-xl"><CardContent className="p-0">
          <ScrollArea className="max-h-[70vh]">
            <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Fecha</th><th className="text-left p-3">Acción</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Usuario</th></tr></thead>
              <tbody>{logs.map((log) => (<tr key={log.id} className="border-b hover:bg-muted/30"><td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString('es-ES')}</td><td className="p-3 font-medium">{log.action}</td><td className="p-3">{log.entityType}</td><td className="p-3 text-muted-foreground">{log.user?.name ?? log.user?.username ?? '-'}</td></tr>))}</tbody>
            </table>
          </ScrollArea>
        </CardContent></Card>
      )}
    </div>
  )
}

// ─── SIMPLE ADMIN TABS (Products, Orders, Clients, Dashboard) ───────────────

function ProductsTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', category: 'general', stock: '0', description: '' })

  const fetchProducts = useCallback(async () => {
    try { const res = await fetch('/api/products', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setProducts(json.products.filter((p: Product) => p.active)) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Nombre obligatorio'); return }
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) { toast.error('Precio inválido'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/products', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: form.name, price, category: form.category, stock: parseInt(form.stock) || 0, description: form.description }) })
      if (res.ok) { toast.success('Producto creado'); setShowCreateDialog(false); setForm({ name: '', price: '', category: 'general', stock: '0', description: '' }); fetchProducts() }
      else { const err = await res.json(); toast.error(err.error || 'Error') }
    } catch { toast.error('Error de red') } finally { setCreating(false) }
  }

  const grouped = categoryOrder.map((cat) => ({ cat, cfg: categoryConfig[cat], products: products.filter((p) => p.category === cat) })).filter((g) => g.products.length > 0)

  if (loading) return <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Productos</h2><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}><Plus className="size-4 mr-1" />Nuevo</Button></div>
      {products.length === 0 ? <Card className="rounded-xl"><CardContent className="p-6 text-center"><Package className="size-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground mb-4">No hay productos</p><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}><Plus className="size-4 mr-1" />Crear Producto</Button></CardContent></Card> : grouped.map(({ cat, cfg, products: catProducts }) => (
        <div key={cat}><div className="flex items-center gap-2 mb-2">{cfg.icon}<h3 className="font-semibold">{cfg.label}</h3><Badge variant="outline" className="text-xs">{catProducts.length}</Badge></div>
          <div className="grid gap-2">{catProducts.map((p) => (<div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border"><div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.description}</p></div><div className="text-right"><p className="font-bold text-amber-700">{formatEUR(p.price)}</p><p className="text-xs text-muted-foreground">Stock: {p.stock}</p></div></div>))}</div>
        </div>
      ))}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}><DialogContent><DialogHeader><DialogTitle>Nuevo Producto</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Precio *</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></div><div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} /></div></div>
          <div className="space-y-2"><Label>Categoría</Label><Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoryOrder.map((c) => <SelectItem key={c} value={c}>{categoryConfig[c]?.label ?? c}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreate} disabled={creating}>{creating ? 'Creando...' : 'Crear'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  )
}

function OrdersTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    try { const res = await fetch('/api/orders?status=pending,in_progress,ready,served', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setOrders(json.orders) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  if (loading) return <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Pedidos</h2><Button variant="outline" size="sm" onClick={fetchOrders}><ShoppingCart className="size-4 mr-1" />Actualizar</Button></div>
      {orders.length === 0 ? <Card className="rounded-xl"><CardContent className="p-6 text-center"><Receipt className="size-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground">No hay pedidos activos</p></CardContent></Card> : (
        <Card className="rounded-xl"><CardContent className="p-0"><ScrollArea className="max-h-[70vh]"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Mesa</th><th className="text-left p-3">Estado</th><th className="text-left p-3">Items</th><th className="text-right p-3">Total</th><th className="text-left p-3">Hora</th></tr></thead><tbody>{orders.map((o) => (<tr key={o.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{o.table?.number ?? '?'}</td><td className="p-3"><Badge variant="outline" className="text-xs">{o.status}</Badge></td><td className="p-3">{o.items?.length ?? 0}</td><td className="p-3 text-right font-semibold">{formatEUR(o.total)}</td><td className="p-3 text-muted-foreground">{formatTime(o.createdAt)}</td></tr>))}</tbody></table></ScrollArea></CardContent></Card>
      )}
    </div>
  )
}

function ClientsTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    try { const res = await fetch('/api/clients', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setClients(json.clients) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchClients() }, [fetchClients])

  if (loading) return <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
      {clients.length === 0 ? <Card className="rounded-xl"><CardContent className="p-6 text-center"><Users className="size-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground">No hay clientes registrados</p></CardContent></Card> : (
        <Card className="rounded-xl"><CardContent className="p-0"><ScrollArea className="max-h-[70vh]"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Nombre</th><th className="text-left p-3">Teléfono</th><th className="text-right p-3">Puntos</th><th className="text-right p-3">Visitas</th></tr></thead><tbody>{clients.map((c) => (<tr key={c.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{c.name}</td><td className="p-3">{c.phone}</td><td className="p-3 text-right"><Star className="size-3 inline mr-1 text-amber-500" />{c.points}</td><td className="p-3 text-right">{c.visits}</td></tr>))}</tbody></table></ScrollArea></CardContent></Card>
      )}
    </div>
  )
}

function DashboardTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    try { const res = await fetch('/api/dashboard', { headers: authHeaders(false) }); if (handleFetchResponse(res) && res.ok) { const json = await res.json(); setData(json) } } catch { /* */ } finally { setLoading(false) }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-amber-100"><Receipt className="size-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Pedidos hoy</p><p className="text-2xl font-bold">{data?.ordersToday ?? 0}</p></div></div></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-green-100"><Euro className="size-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Ingresos hoy</p><p className="text-2xl font-bold">{formatEUR(data?.revenueToday ?? 0)}</p></div></div></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-orange-100"><UtensilsCrossed className="size-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Mesas ocupadas</p><p className="text-2xl font-bold">{data?.occupiedTables ?? 0}</p></div></div></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-blue-100"><Users className="size-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Usuarios</p><p className="text-2xl font-bold">{data?.totalUsers ?? 0}</p></div></div></CardContent></Card>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  const { activeTab, setActiveTab, realtimeConnected, setRealtimeConnected, selectedRestaurantId, setSelectedRestaurantId } = useRestaurantStore()

  const [authToken, setAuthToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ userId: string; username: string; role: string; name: string; restaurantId?: string; mustChangePassword?: boolean } | null>(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)
  const [changePasswordCurrent, setChangePasswordCurrent] = useState('')
  const [changePasswordNew, setChangePasswordNew] = useState('')
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')

  // Load auth from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('restaurantos_auth')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.token) {
          try {
            const base64Url = parsed.token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
            const { exp } = JSON.parse(jsonPayload)
            if (exp && exp * 1000 > Date.now()) { setAuthToken(parsed.token); setCurrentUser(parsed.user) }
            else if (parsed.refreshToken) { fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: parsed.refreshToken }) }).then((r) => r.json()).then((data) => { if (data.token) { const userData = { userId: data.user.id, username: data.user.username, name: data.user.name, role: data.user.role, restaurantId: data.user.restaurantId, mustChangePassword: data.mustChangePassword ?? data.user.mustChangePassword ?? false }; setAuthToken(data.token); setCurrentUser(userData); localStorage.setItem('restaurantos_auth', JSON.stringify({ token: data.token, refreshToken: data.refreshToken, user: userData })) } else { localStorage.removeItem('restaurantos_auth') } }).catch(() => localStorage.removeItem('restaurantos_auth')) }
            else { localStorage.removeItem('restaurantos_auth') }
          } catch { setAuthToken(parsed.token); setCurrentUser(parsed.user) }
        }
      } catch { /* */ }
    }
  }, [])

  const authHeaders = useCallback((contentType = true) => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    // For super_admin, use selected restaurant context
    if (currentUser?.role === 'super_admin' && selectedRestaurantId) {
      headers['X-Restaurant-Id'] = selectedRestaurantId
    } else if (currentUser?.restaurantId) {
      headers['X-Restaurant-Id'] = currentUser.restaurantId
    }
    return headers
  }, [authToken, currentUser?.restaurantId, currentUser?.role, selectedRestaurantId])

  const handleFetchResponse = useCallback((res: Response) => {
    if (res.status === 401) { setAuthToken(null); setCurrentUser(null); localStorage.removeItem('restaurantos_auth'); toast.error('Sesión expirada'); return false }
    return true
  }, [])

  const logout = useCallback(() => { setAuthToken(null); setCurrentUser(null); setSelectedRestaurantId(null); localStorage.removeItem('restaurantos_auth') }, [setSelectedRestaurantId])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true)
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loginUsername, password: loginPassword }) })
      const data = await res.json()
      if (res.ok) {
        const userData = { userId: data.user.id, username: data.user.username, name: data.user.name, role: data.user.role, restaurantId: data.user.restaurantId, mustChangePassword: data.mustChangePassword ?? data.user.mustChangePassword ?? false }
        setAuthToken(data.token); setCurrentUser(userData)
        localStorage.setItem('restaurantos_auth', JSON.stringify({ token: data.token, refreshToken: data.refreshToken, user: userData }))
        setLoginUsername(''); setLoginPassword('')
        if (userData.mustChangePassword) setShowChangePasswordDialog(true)
      } else { setLoginError(data.error || 'Error al iniciar sesión') }
    } catch { setLoginError('Error de red') } finally { setLoginLoading(false) }
  }

  useEffect(() => { if (!authToken) return; setRealtimeConnected(true) }, [authToken, setRealtimeConnected])

  const handleChangePassword = async () => {
    if (!changePasswordNew || changePasswordNew.length < 6) { setChangePasswordError('Mínimo 6 caracteres'); return }
    setChangePasswordLoading(true); setChangePasswordError('')
    try {
      const res = await fetch('/api/users/change-password', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ currentPassword: changePasswordCurrent, newPassword: changePasswordNew }) })
      if (res.ok) { toast.success('Contraseña cambiada'); setShowChangePasswordDialog(false); setChangePasswordCurrent(''); setChangePasswordNew(''); setCurrentUser((u) => u ? { ...u, mustChangePassword: false } : u) }
      else { const err = await res.json(); setChangePasswordError(err.error || 'Error al cambiar contraseña') }
    } catch { setChangePasswordError('Error de red') } finally { setChangePasswordLoading(false) }
  }

  // ─── Tab Configuration by Role ─────────────────────────────

  const isSuperAdmin = currentUser?.role === 'super_admin'
  const isAdmin = currentUser?.role === 'admin'
  const isEncargado = currentUser?.role === 'encargado'
  const isCamarero = currentUser?.role === 'camarero'
  const isCocina = currentUser?.role === 'cocina'
  const isCaja = currentUser?.role === 'caja'

  // Super admin needs a selected restaurant for operational tabs
  const needsRestaurantContext = isSuperAdmin && !selectedRestaurantId

  const allTabs = [
    { id: 'restaurants' as TabId, label: 'Restaurantes', icon: <Building2 className="size-4" />, roles: ['super_admin'] },
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: <LayoutDashboard className="size-4" />, roles: ['super_admin', 'admin', 'encargado'] },
    { id: 'users' as TabId, label: 'Usuarios', icon: <Users className="size-4" />, roles: ['super_admin', 'admin'] },
    { id: 'tables' as TabId, label: 'Mesas', icon: <UtensilsCrossed className="size-4" />, roles: ['super_admin', 'admin'] },
    { id: 'products' as TabId, label: 'Productos', icon: <Package className="size-4" />, roles: ['super_admin', 'admin'] },
    { id: 'orders' as TabId, label: 'Pedidos', icon: <Receipt className="size-4" />, roles: ['super_admin', 'admin', 'encargado'] },
    { id: 'clients' as TabId, label: 'Clientes', icon: <Users className="size-4" />, roles: ['super_admin', 'admin', 'encargado'] },
    { id: 'reportes' as TabId, label: 'Reportes', icon: <BarChart3 className="size-4" />, roles: ['super_admin', 'admin', 'encargado'] },
    { id: 'audit' as TabId, label: 'Auditoría', icon: <ClipboardList className="size-4" />, roles: ['super_admin', 'admin', 'encargado'] },
    { id: 'camarero' as TabId, label: 'Camarero', icon: <Utensils className="size-4" />, roles: ['super_admin', 'admin', 'encargado', 'camarero'] },
    { id: 'cocina' as TabId, label: 'Cocina', icon: <ChefHat className="size-4" />, roles: ['super_admin', 'admin', 'encargado', 'cocina'] },
    { id: 'caja' as TabId, label: 'Caja', icon: <CreditCard className="size-4" />, roles: ['super_admin', 'admin', 'encargado', 'caja'] },
  ]

  const visibleTabs = allTabs.filter((t) => currentUser && t.roles.includes(currentUser.role))
  const currentTabObj = allTabs.find((t) => t.id === activeTab)

  // Auto-select default tab if current is not visible
  useEffect(() => {
    if (!currentUser) return
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.id === activeTab)) {
      if (isSuperAdmin) setActiveTab('restaurants')
      else if (isCamarero) setActiveTab('camarero')
      else if (isCocina) setActiveTab('cocina')
      else if (isCaja) setActiveTab('caja')
      else setActiveTab(visibleTabs[0].id)
    }
  }, [currentUser, visibleTabs, activeTab, setActiveTab, isSuperAdmin, isCamarero, isCocina, isCaja])

  // ─── Login Screen ──────────────────────────────────────────
  if (!authToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <Card className="w-full max-w-sm rounded-2xl shadow-xl">
          <CardHeader className="text-center pb-2"><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 mb-3"><Flame className="size-8 text-amber-600" /></div><CardTitle className="text-2xl font-bold text-amber-800">RestaurantOS</CardTitle><p className="text-sm text-muted-foreground mt-1">Inicia sesión para continuar</p></CardHeader>
          <CardContent><form onSubmit={handleLogin} className="space-y-4"><div className="space-y-2"><Label htmlFor="username">Usuario</Label><Input id="username" type="text" placeholder="usuario" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="h-12" required /></div><div className="space-y-2"><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" placeholder="••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="h-12" required /></div>{loginError && <p className="text-sm text-red-600 text-center">{loginError}</p>}<Button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white text-base font-semibold" disabled={loginLoading}>{loginLoading ? 'Entrando...' : 'Entrar'}</Button></form></CardContent>
        </Card>
      </div>
    )
  }

  // ─── Authenticated App ─────────────────────────────────────
  return (
    <AuthContext.Provider value={{ authToken, currentUser, authHeaders, handleFetchResponse, logout }}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100"><Flame className="size-5 text-amber-600" /></div>
              <span className="font-bold text-amber-800 text-lg hidden sm:inline">RestaurantOS</span>
            </div>

            {/* Super admin restaurant context indicator */}
            {isSuperAdmin && selectedRestaurantId && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSelectedRestaurantId(null); setActiveTab('restaurants') }}>
                <ArrowLeft className="size-3 mr-1" />Restaurante
              </Button>
            )}

            {/* Tabs - horizontal scrollable */}
            <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-1">
                {visibleTabs.map((tab) => (
                  <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'ghost'} size="sm" className={`h-8 text-xs shrink-0 ${activeTab === tab.id ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`} onClick={() => setActiveTab(tab.id)}>
                    {tab.icon}<span className="ml-1 hidden md:inline">{tab.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* User info */}
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">{roleLabels[currentUser?.role ?? ''] ?? currentUser?.role}</Badge>
              <span className="text-sm font-medium hidden lg:inline">{currentUser?.name || currentUser?.username}</span>
              <Button variant="ghost" size="sm" className="size-8 p-0" onClick={logout}><LogOut className="size-4" /></Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-4">
          {needsRestaurantContext && !['restaurants'].includes(activeTab) ? (
            <Card className="rounded-xl"><CardContent className="p-8 text-center"><Building2 className="size-12 mx-auto mb-3 text-muted-foreground" /><h3 className="text-lg font-bold mb-2">Selecciona un restaurante</h3><p className="text-muted-foreground mb-4">Para operar en esta sección necesitas seleccionar un restaurante.</p><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setActiveTab('restaurants')}>Ir a Restaurantes</Button></CardContent></Card>
          ) : (
            <>
              {activeTab === 'restaurants' && <RestaurantesTab />}
              {activeTab === 'dashboard' && <DashboardTab />}
              {activeTab === 'users' && <UsersTab />}
              {activeTab === 'tables' && <TablesTab />}
              {activeTab === 'products' && <ProductsTab />}
              {activeTab === 'orders' && <OrdersTab />}
              {activeTab === 'clients' && <ClientsTab />}
              {activeTab === 'reportes' && <ReportesTab />}
              {activeTab === 'audit' && <AuditTab />}
              {activeTab === 'camarero' && <CamareroTab />}
              {activeTab === 'cocina' && <CocinaTab />}
              {activeTab === 'caja' && <CajaTab />}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t bg-white py-3">
          <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>RestaurantOS v1.0</span>
            <span>{realtimeConnected ? '🟢 Conectado' : '🔴 Desconectado'}</span>
          </div>
        </footer>
      </div>

      {/* Must Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent><DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Debes cambiar tu contraseña antes de continuar.</p>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Contraseña actual</Label><Input type="password" value={changePasswordCurrent} onChange={(e) => setChangePasswordCurrent(e.target.value)} /></div>
            <div className="space-y-2"><Label>Nueva contraseña</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={changePasswordNew} onChange={(e) => setChangePasswordNew(e.target.value)} /></div>
            {changePasswordError && <p className="text-sm text-red-600">{changePasswordError}</p>}
          </div>
          <DialogFooter><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleChangePassword} disabled={changePasswordLoading}>{changePasswordLoading ? 'Cambiando...' : 'Cambiar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  )
}
