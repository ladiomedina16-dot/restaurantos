'use client'

import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react'
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
  LogOut,
  Printer,
  BarChart3,
  Lock,
  AlertTriangle,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  Building2,
  Shield,
  ShieldOff,
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
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { useRestaurantStore, type TabId } from '@/lib/store'
import { toast } from 'sonner'

// ─── Client-side permission check (mirrors server ROLE_PERMISSIONS) ──────────
const CLIENT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['orders:read', 'orders:create', 'orders:update', 'orders:pay', 'products:read', 'products:create', 'products:update', 'products:delete', 'tables:read', 'tables:create', 'tables:update', 'tables:delete', 'clients:read', 'clients:create', 'clients:update', 'clients:delete', 'users:read', 'users:create', 'users:update', 'users:delete', 'payments:read', 'dashboard:read', 'cash:read', 'cash:open', 'cash:close', 'print:read', 'audit:read'],
  encargado: ['orders:read', 'orders:create', 'orders:update', 'orders:pay', 'products:read', 'products:update', 'tables:read', 'tables:update', 'clients:read', 'clients:create', 'clients:update', 'users:read', 'payments:read', 'dashboard:read', 'cash:read', 'cash:open', 'cash:close', 'print:read', 'audit:read'],
  camarero: ['orders:read', 'orders:create', 'products:read', 'tables:read', 'clients:read', 'clients:create'],
  cocina: ['orders:read', 'orders:update', 'products:read'],
  caja: ['orders:read', 'orders:pay', 'products:read', 'tables:read', 'clients:read', 'payments:read', 'cash:read', 'cash:open', 'cash:close', 'print:read'],
}

function clientHasPermission(role: string, permission: string): boolean {
  const perms = CLIENT_ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

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
  modifiers: string
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
  createdById?: string | null
  finishedById?: string | null
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

interface UserItem {
  id: string
  username: string
  name: string
  role: string
  active: boolean
  mustChangePassword: boolean
  zone: string | null
  restaurantId: string | null
  createdAt: string
  updatedAt: string
}

interface DashboardData {
  stats: {
    totalOrdersToday: number
    revenueToday: number
    occupiedTables: number
    totalActiveTables: number
    totalActiveProducts: number
    lowStockCount: number
  }
  topProducts: { productId: string; name: string; totalQuantity: number; totalRevenue: number }[]
  lowStockProducts: { id: string; name: string; stock: number; category: string }[]
  recentOrders: Order[]
  ordersByStatus: { status: string; count: number }[]
  categories: { category: string; count: number }[]
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
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ type, orderId }),
    })
    if (res.ok) {
      const { html } = await res.json()
      const printWindow = window.open('', '_blank', 'width=320,height=600')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
    } else {
      toast.error('Error al imprimir ticket')
    }
  } catch {
    toast.error('Error al imprimir ticket')
  }
}

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
  const { authHeaders, handleFetchResponse } = useAuth()

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

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTables(), fetchProducts()])
      setLoading(false)
    }
    load()
    const interval = setInterval(fetchTables, 8000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchProducts])

  // Polling: tables refresh via interval (Vercel-compatible, no Socket.io)

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
        headers: authHeaders(),
        body: JSON.stringify(body),
      })

      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        toast.success('Pedido enviado a cocina')
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
  const { authHeaders, handleFetchResponse } = useAuth()

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?status=pending,in_progress', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setOrders(json.orders)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // Update time display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  // Polling: cocina orders refresh via fast interval (Vercel-compatible, no Socket.io)

  const handleTerminar = async (order: Order) => {
    setFinishing(order.id)
    try {
      // First set to in_progress if pending
      if (order.status === 'pending') {
        const preRes = await fetch(`/api/orders/${order.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ status: 'in_progress' }),
        })
        handleFetchResponse(preRes)
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'ready' }),
      })

      if (handleFetchResponse(res) && res.ok) {
        toast.success(`Mesa ${order.table?.number ?? '?'} — Pedido listo`)
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
                    {item.modifiers && item.modifiers !== '[]' && item.modifiers !== '' && (
                      <span className="text-xs text-red-400 ml-1">
                        ({JSON.parse(item.modifiers).join(', ')})
                      </span>
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

              {/* Terminar button + Print buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-14 border-gray-600 text-white hover:bg-gray-700"
                  onClick={() => handlePrintTicket('kitchen', order.id, authHeaders)}
                >
                  <Printer className="size-5 mr-1" />
                  Cocina
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-14 border-gray-600 text-white hover:bg-gray-700"
                  onClick={() => handlePrintTicket('bar', order.id, authHeaders)}
                >
                  <Wine className="size-5 mr-1" />
                  Barra
                </Button>
              </div>
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const { authHeaders, handleFetchResponse } = useAuth()

  // ─── Cash Session State ──────────────────────────────────────
  const [cashSession, setCashSession] = useState<any>(null)
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false)
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false)
  const [openingCashInput, setOpeningCashInput] = useState('')
  const [closingCashInput, setClosingCashInput] = useState('')
  const [cashSessionLoading, setCashSessionLoading] = useState(false)
  const [cashCloseSummary, setCashCloseSummary] = useState<any>(null)

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setTables(json.tables.filter((t: TableItem) => t.active))
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse])

  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?status=pending,in_progress,ready,served', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setOrders(json.orders)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse])

  const fetchCashSession = useCallback(async () => {
    try {
      const res = await fetch('/api/cash-sessions?current=true', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        if (json.sessions && json.sessions.length > 0) {
          setCashSession(json.sessions[0])
        } else if (json.cashSession) {
          setCashSession(json.cashSession)
        } else {
          setCashSession(null)
        }
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTables(), fetchActiveOrders(), fetchCashSession()])
      setLoading(false)
    }
    load()
    const interval = setInterval(() => { fetchTables(); fetchActiveOrders() }, 8000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchActiveOrders, fetchCashSession])

  // Update time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  // Polling: caja refreshes via interval (Vercel-compatible, no Socket.io)

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
    if (!cashSession) {
      toast.error('Abre caja para poder cobrar')
      return
    }
    setPaying(true)
    try {
      // Pay each order
      for (const order of selectedOrders) {
        const res = await fetch(`/api/orders/${order.id}/pay`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ applyDiscount: true, paymentMethod: selectedPaymentMethod }),
        })
        if (!handleFetchResponse(res) || !res.ok) {
          const err = await res.json()
          toast.error(err.error || 'Error al cobrar pedido')
          setPaying(false)
          return
        }
      }
      toast.success(`Mesa ${selectedTable?.number ?? '?'} cobrada — ${formatEUR(total)}`)
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

              <div className="flex gap-2">
                <Button
                  variant={selectedPaymentMethod === 'efectivo' ? 'default' : 'outline'}
                  className={`flex-1 h-12 ${selectedPaymentMethod === 'efectivo' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  onClick={() => setSelectedPaymentMethod('efectivo')}
                >
                  <Euro className="size-5 mr-2" />
                  Efectivo
                </Button>
                <Button
                  variant={selectedPaymentMethod === 'tarjeta' ? 'default' : 'outline'}
                  className={`flex-1 h-12 ${selectedPaymentMethod === 'tarjeta' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                  onClick={() => setSelectedPaymentMethod('tarjeta')}
                >
                  <CreditCard className="size-5 mr-2" />
                  Tarjeta
                </Button>
              </div>

              <Button
                className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCobrar}
                disabled={paying || selectedOrders.length === 0 || !cashSession}
              >
                <Euro className="size-6 mr-2" />
                {paying ? 'Cobrando...' : 'COBRAR'}
              </Button>

              {!cashSession && (
                <p className="text-sm text-red-600 text-center font-medium mt-1">
                  Abre caja para poder cobrar
                </p>
              )}

              {/* Print receipt button */}
              <Button
                variant="outline"
                className="w-full h-12 mt-2"
                onClick={() => {
                  // Print receipt for the first selected order
                  if (selectedOrders.length > 0) {
                    handlePrintTicket('receipt', selectedOrders[0].id, authHeaders)
                  }
                }}
              >
                <Printer className="size-5 mr-2" />
                Imprimir Recibo
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
      {/* Cash Session Section */}
      <Card className="rounded-xl border-2 border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          {!cashSession ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Lock className="size-5 text-red-600" />
                  Caja Cerrada
                </h3>
                <p className="text-sm text-muted-foreground">Debes abrir caja para poder cobrar</p>
              </div>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowOpenCashDialog(true)}
              >
                Abrir Caja
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CheckCircle className="size-5 text-green-600" />
                  Caja Abierta
                </h3>
                <p className="text-sm text-muted-foreground">
                  Apertura: {formatEUR(cashSession.openingCash)} ·
                  Iniciada: {formatTime(cashSession.openedAt)}
                  {cashSession.openedBy && ` · Por: ${cashSession.openedBy.name ?? cashSession.openedBy.username ?? ''}`}
                </p>
              </div>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setShowCloseCashDialog(true)}
              >
                Cerrar Caja
              </Button>
            </div>
          )}
          {cashCloseSummary && (
            <div className="mt-3 p-3 bg-white rounded-lg border text-sm space-y-1">
              <p className="font-bold text-base mb-1">Resumen de cierre</p>
              <div className="flex justify-between"><span>Ventas totales:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalSales ?? 0)}</span></div>
              <div className="flex justify-between"><span>Efectivo:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCash ?? 0)}</span></div>
              <div className="flex justify-between"><span>Tarjeta:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCard ?? 0)}</span></div>
              <Separator />
              <div className="flex justify-between"><span>Esperado:</span><span className="font-semibold">{formatEUR(cashCloseSummary.expectedCash ?? 0)}</span></div>
              <div className="flex justify-between"><span>Real:</span><span className="font-semibold">{formatEUR(cashCloseSummary.closingCash ?? 0)}</span></div>
              <div className="flex justify-between"><span>Diferencia:</span>
                <span className={`font-bold ${(cashCloseSummary.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatEUR(cashCloseSummary.difference ?? 0)}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setCashCloseSummary(null)}>
                Cerrar resumen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Cash Dialog */}
      <Dialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Efectivo de apertura (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenCashDialog(false)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={cashSessionLoading || !openingCashInput}
              onClick={async () => {
                setCashSessionLoading(true)
                try {
                  const res = await fetch('/api/cash-sessions', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ openingCash: parseFloat(openingCashInput) }),
                  })
                  if (handleFetchResponse(res) && res.ok) {
                    toast.success('Caja abierta correctamente')
                    setShowOpenCashDialog(false)
                    setOpeningCashInput('')
                    fetchCashSession()
                  } else {
                    const err = await res.json()
                    toast.error(err.error || 'Error al abrir caja')
                  }
                } catch {
                  toast.error('Error de red')
                } finally {
                  setCashSessionLoading(false)
                }
              }}
            >
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={showCloseCashDialog} onOpenChange={setShowCloseCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Efectivo de cierre (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closingCashInput}
                onChange={(e) => setClosingCashInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseCashDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={cashSessionLoading || !closingCashInput}
              onClick={async () => {
                setCashSessionLoading(true)
                try {
                  const res = await fetch(`/api/cash-sessions/${cashSession.id}`, {
                    method: 'PUT',
                    headers: authHeaders(),
                    body: JSON.stringify({ closingCash: parseFloat(closingCashInput) }),
                  })
                  if (handleFetchResponse(res) && res.ok) {
                    const data = await res.json()
                    setCashCloseSummary(data.cashSession ?? data)
                    toast.success('Caja cerrada correctamente')
                    setShowCloseCashDialog(false)
                    setClosingCashInput('')
                    setCashSession(null)
                    fetchCashSession()
                  } else {
                    const err = await res.json()
                    toast.error(err.error || 'Error al cerrar caja')
                  }
                } catch {
                  toast.error('Error de red')
                } finally {
                  setCashSessionLoading(false)
                }
              }}
            >
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      const res = await fetch(`/api/reports?${params.toString()}`, { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setReportData(json)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [reportType, dateFrom, dateTo, authHeaders, handleFetchResponse])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const reportTypes = [
    { value: 'daily_sales' as const, label: 'Ventas del día' },
    { value: 'payment_methods' as const, label: 'Por método de pago' },
    { value: 'top_products' as const, label: 'Productos más vendidos' },
    { value: 'cancelled_orders' as const, label: 'Pedidos cancelados' },
    { value: 'cash_closes' as const, label: 'Cierres de caja' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
        <Button variant="outline" size="sm" className="h-10" onClick={fetchReport} disabled={loading}>
          <BarChart3 className="size-4 mr-1" />
          {loading ? 'Cargando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {reportTypes.map((rt) => (
              <Button
                key={rt.value}
                variant={reportType === rt.value ? 'default' : 'outline'}
                size="sm"
                className={reportType === rt.value ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={() => { setReportType(rt.value); setReportData(null) }}
              >
                {rt.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : !reportData ? (
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">Selecciona un reporte y haz clic en Actualizar</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Daily Sales */}
          {reportType === 'daily_sales' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5" />
                  Ventas del día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ingresos</p>
                    <p className="text-2xl font-bold text-amber-700">{formatEUR(reportData.totalRevenue ?? 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                    <p className="text-2xl font-bold text-amber-700">{reportData.totalOrders ?? 0}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ticket medio</p>
                    <p className="text-2xl font-bold text-amber-700">{formatEUR(reportData.avgTicket ?? 0)}</p>
                  </div>
                </div>
                {reportData.days && reportData.days.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-right p-2">Ingresos</th>
                          <th className="text-right p-2">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.days.map((d: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{d.date}</td>
                            <td className="text-right p-2 font-semibold">{formatEUR(d.revenue)}</td>
                            <td className="text-right p-2">{d.orders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Methods */}
          {reportType === 'payment_methods' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <Euro className="size-10 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground">Efectivo</p>
                  <p className="text-3xl font-bold text-green-700">{formatEUR(reportData.efectivo?.total ?? 0)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{reportData.efectivo?.count ?? 0} pagos</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <CreditCard className="size-10 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Tarjeta</p>
                  <p className="text-3xl font-bold text-blue-700">{formatEUR(reportData.tarjeta?.total ?? 0)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{reportData.tarjeta?.count ?? 0} pagos</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Products */}
          {reportType === 'top_products' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="size-5" />
                  Productos más vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.products && reportData.products.length > 0 ? (
                  <div className="space-y-2">
                    {reportData.products.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.quantity} unidades</p>
                          </div>
                        </div>
                        <span className="font-bold text-amber-700">{formatEUR(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay datos</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancelled Orders */}
          {reportType === 'cancelled_orders' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="size-5 text-red-500" />
                  Pedidos cancelados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Ingresos perdidos</p>
                  <p className="text-2xl font-bold text-red-700">{formatEUR(reportData.totalLost ?? reportData.lostRevenue ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">{reportData.totalCount ?? reportData.orders?.length ?? 0} pedidos</p>
                </div>
                {reportData.orders && reportData.orders.length > 0 ? (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {reportData.orders.map((o: any) => (
                        <div key={o.id} className="border rounded-lg p-3">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold">Mesa {o.table?.number ?? '?'}</span>
                            <span className="font-bold text-red-600">{formatEUR(o.total)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('es-ES')}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay pedidos cancelados</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cash Closes */}
          {reportType === 'cash_closes' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="size-5" />
                  Cierres de caja
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.sessions && reportData.sessions.length > 0 ? (
                  <ScrollArea className="max-h-96">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Apertura</th>
                          <th className="text-right p-2">Apertura €</th>
                          <th className="text-right p-2">Cierre €</th>
                          <th className="text-right p-2">Ventas</th>
                          <th className="text-right p-2">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.sessions.map((s: any) => (
                          <tr key={s.id} className="border-b">
                            <td className="p-2">{s.openedAt ? new Date(s.openedAt).toLocaleString('es-ES') : '-'}</td>
                            <td className="text-right p-2">{formatEUR(s.openingCash)}</td>
                            <td className="text-right p-2">{s.closingCash != null ? formatEUR(s.closingCash) : '-'}</td>
                            <td className="text-right p-2">{formatEUR(s.totalSales ?? 0)}</td>
                            <td className={`text-right p-2 font-semibold ${(s.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {s.difference != null ? formatEUR(s.difference) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay cierres de caja</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ─── PRODUCTS TAB ────────────────────────────────────────────────────────

function ProductsTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authToken, currentUser, authHeaders, handleFetchResponse } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all') // all, active, inactive

  // Product form dialog state
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'general',
    stock: 0,
  })
  const [productFormLoading, setProductFormLoading] = useState(false)
  const [productFormError, setProductFormError] = useState('')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toggle active state
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const canCreate = currentUser ? clientHasPermission(currentUser.role, 'products:create') : false
  const canUpdate = currentUser ? clientHasPermission(currentUser.role, 'products:update') : false
  const canDelete = currentUser ? clientHasPermission(currentUser.role, 'products:delete') : false

  const fetchProducts = useCallback(async () => {
    if (!authToken) return
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (activeFilter === 'active') params.set('active', 'true')
      else if (activeFilter === 'inactive') params.set('active', 'false')

      const headers = authHeaders(false)
      // If overrideRestaurantId is provided (super_admin viewing a restaurant), use it
      if (overrideRestaurantId) {
        headers['X-Restaurant-Id'] = overrideRestaurantId
      }

      const res = await fetch(`/api/products?${params.toString()}`, { headers })
      if (!handleFetchResponse(res)) return
      const data = await res.json()
      setProducts(data.products || [])
    } catch {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [authToken, categoryFilter, activeFilter, authHeaders, handleFetchResponse, overrideRestaurantId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Filter by search text client-side
  const filtered = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
  })

  // Group by category for display
  const grouped = categoryFilter === 'all'
    ? categoryOrder.reduce<Record<string, Product[]>>((acc, cat) => {
        const items = filtered.filter((p) => p.category === cat)
        if (items.length > 0) acc[cat] = items
        return acc
      }, {})
    : { [categoryFilter]: filtered }

  const openCreateDialog = () => {
    setEditingProduct(null)
    setProductForm({ name: '', description: '', price: 0, category: 'bebida', stock: 50 })
    setProductFormError('')
    setShowProductDialog(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category,
      stock: product.stock,
    })
    setProductFormError('')
    setShowProductDialog(true)
  }

  const handleSaveProduct = async () => {
    setProductFormError('')
    if (!productForm.name.trim()) {
      setProductFormError('El nombre es obligatorio')
      return
    }
    if (productForm.price < 0) {
      setProductFormError('El precio no puede ser negativo')
      return
    }

    setProductFormLoading(true)
    try {
      // Build headers with correct restaurant scope
      const headers = authHeaders()
      if (overrideRestaurantId) {
        headers['X-Restaurant-Id'] = overrideRestaurantId
      }

      if (editingProduct) {
        // Update existing
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name: productForm.name,
            description: productForm.description,
            price: productForm.price,
            category: productForm.category,
            stock: productForm.stock,
          }),
        })
        if (!handleFetchResponse(res)) return
        if (res.ok) {
          toast.success('Producto actualizado')
          setShowProductDialog(false)
          fetchProducts()
        } else {
          const err = await res.json()
          setProductFormError(err.error || 'Error al actualizar producto')
        }
      } else {
        // Create new
        const res = await fetch('/api/products', {
          method: 'POST',
          headers,
          body: JSON.stringify(productForm),
        })
        if (!handleFetchResponse(res)) return
        if (res.ok) {
          toast.success('Producto creado')
          setShowProductDialog(false)
          fetchProducts()
        } else {
          const err = await res.json()
          setProductFormError(err.error || 'Error al crear producto')
        }
      }
    } catch {
      setProductFormError('Error de red')
    } finally {
      setProductFormLoading(false)
    }
  }

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ active: !product.active }),
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        toast.success(product.active ? 'Producto desactivado' : 'Producto activado')
        fetchProducts()
      } else {
        toast.error('Error al cambiar estado')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/products/${deleteTarget.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        toast.success('Producto eliminado')
        setDeleteTarget(null)
        fetchProducts()
      } else {
        toast.error('Error al eliminar producto')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="size-5 text-amber-600" />
            Productos
          </h2>
          <p className="text-sm text-muted-foreground">
            {products.length} producto{products.length !== 1 ? 's' : ''} en la carta
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreateDialog} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Plus className="size-4" />
            Crear producto
          </Button>
        )}
      </div>

      {/* Search + Active Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Inactivos' },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={activeFilter === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={activeFilter === opt.value ? 'bg-amber-600 hover:bg-amber-700 text-white h-8' : 'h-8'}
              onClick={() => { setActiveFilter(opt.value); setLoading(true) }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className={categoryFilter === 'all' ? 'bg-amber-600 hover:bg-amber-700 text-white rounded-full h-8' : 'rounded-full h-8'}
          onClick={() => { setCategoryFilter('all'); setLoading(true) }}
        >
          <Filter className="size-3.5 mr-1" />
          Todos
        </Button>
        {categoryOrder.map((cat) => {
          const cfg = categoryConfig[cat]
          if (!cfg) return null
          const count = products.filter((p) => p.category === cat).length
          if (count === 0) return null
          return (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              className={categoryFilter === cat ? 'bg-amber-600 hover:bg-amber-700 text-white rounded-full h-8' : 'rounded-full h-8'}
              onClick={() => { setCategoryFilter(cat); setLoading(true) }}
            >
              {cfg.icon}
              <span className="ml-1">{cfg.label}</span>
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {count}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Product List */}
      {filtered.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center text-muted-foreground">
            <Package className="size-12 mb-3 opacity-30" />
            <p className="font-semibold">No hay productos</p>
            <p className="text-sm">
              {search ? 'No se encontraron productos con esa búsqueda' : 'Crea el primer producto para empezar'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => {
            const cfg = categoryConfig[cat] || { label: cat, icon: <Package className="size-4" /> }
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                    {cfg.icon}
                    {cfg.label}
                  </div>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  <Separator className="flex-1" />
                </div>

                {/* Desktop: Table view */}
                <div className="hidden md:block rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[250px]">Producto</TableHead>
                        <TableHead className="w-[80px] text-right">Precio</TableHead>
                        <TableHead className="w-[80px] text-center">Stock</TableHead>
                        <TableHead className="w-[90px] text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((p) => (
                        <TableRow key={p.id} className={!p.active ? 'opacity-50' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              {p.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[220px]">{p.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatEUR(p.price)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={p.stock > 10 ? 'secondary' : p.stock > 0 ? 'outline' : 'destructive'} className="text-xs">
                              {p.stock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {p.active ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Activo</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleToggleActive(p)}
                                  disabled={togglingId === p.id}
                                  title={p.active ? 'Desactivar' : 'Activar'}
                                >
                                  {togglingId === p.id ? (
                                    <span className="size-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                                  ) : p.active ? (
                                    <Eye className="size-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="size-4 text-muted-foreground" />
                                  )}
                                </Button>
                              )}
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditDialog(p)}
                                  title="Editar"
                                >
                                  <Pencil className="size-4 text-amber-600" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setDeleteTarget(p)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="size-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: Card view */}
                <div className="md:hidden space-y-2">
                  {items.map((p) => (
                    <Card key={p.id} className={!p.active ? 'opacity-50' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-amber-700">{formatEUR(p.price)}</p>
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                              <Badge variant={p.stock > 10 ? 'secondary' : p.stock > 0 ? 'outline' : 'destructive'} className="text-xs px-1.5">
                                Stock: {p.stock}
                              </Badge>
                              {p.active ? (
                                <Badge className="bg-green-100 text-green-800 text-xs px-1.5">Activo</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-1.5">Inactivo</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {(canUpdate || canDelete) && (
                          <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t">
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleToggleActive(p)}
                                disabled={togglingId === p.id}
                                title={p.active ? 'Desactivar' : 'Activar'}
                              >
                                {p.active ? <Eye className="size-3.5 text-green-600" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                              </Button>
                            )}
                            {canUpdate && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(p)} title="Editar">
                                <Pencil className="size-3.5 text-amber-600" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(p)} title="Eliminar">
                                <Trash2 className="size-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingProduct ? (
                <><Pencil className="size-5 text-amber-600" /> Editar producto</>
              ) : (
                <><Plus className="size-5 text-amber-600" /> Crear producto</>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los datos del producto' : 'Añade un nuevo producto a la carta'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Nombre del producto"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción del producto"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio (€) *</Label>
                <Input
                  type="number"
                  step="0.10"
                  min="0"
                  placeholder="0.00"
                  value={productForm.price || ''}
                  onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOrder.map((cat) => {
                    const cfg = categoryConfig[cat]
                    return (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-2">
                          {cfg?.icon}
                          {cfg?.label || cat}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {productFormError && (
              <p className="text-sm text-red-600 text-center">{productFormError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={productFormLoading || !productForm.name.trim()}
              onClick={handleSaveProduct}
            >
              {productFormLoading ? 'Guardando...' : editingProduct ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se desactivará <strong>{deleteTarget?.name}</strong>. El producto quedará inactivo pero no se borrará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteLoading}
              onClick={handleDeleteProduct}
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── SUPER ADMIN PANEL ──────────────────────────────────────────────────

interface RestaurantItem {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  active: boolean
  subscriptionStatus: string
  createdAt: string
  _count?: { users: number; products: number; orders: number }
}

function SuperAdminPanel() {
  const { authToken, currentUser, authHeaders, handleFetchResponse } = useAuth()
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState({ name: '', slug: '', address: '', phone: '', adminUsername: '', adminPassword: '', adminName: '' })
  const [onboardingError, setOnboardingError] = useState('')
  const [viewRestaurantId, setViewRestaurantId] = useState<string | null>(null)
  const [blockLoading, setBlockLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RestaurantItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchRestaurants = useCallback(async () => {
    if (!authToken) return
    try {
      const res = await fetch('/api/restaurants', { headers: { Authorization: `Bearer ${authToken}` } })
      if (!handleFetchResponse(res)) return
      const data = await res.json()
      setRestaurants(data.restaurants || [])
    } catch {
      toast.error('Error al cargar restaurantes')
    } finally {
      setLoading(false)
    }
  }, [authToken, handleFetchResponse])

  useEffect(() => {
    fetchRestaurants()
  }, [fetchRestaurants])

  const handleOnboarding = async () => {
    setOnboardingError('')
    const payload = {
      restaurantName: onboardingForm.name,
      slug: onboardingForm.slug,
      address: onboardingForm.address,
      phone: onboardingForm.phone,
      adminUsername: onboardingForm.adminUsername,
      adminPassword: onboardingForm.adminPassword,
      adminName: onboardingForm.adminName,
    }
    console.log('[ONBOARDING] Payload:', JSON.stringify(payload, null, 2))

    setOnboardingLoading(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Restaurante y admin creados correctamente')
        setShowOnboardingDialog(false)
        setOnboardingForm({ name: '', slug: '', address: '', phone: '', adminUsername: '', adminPassword: '', adminName: '' })
        // Refresh restaurant list
        setLoading(true)
        fetchRestaurants()
      } else {
        const err = await res.json()
        setOnboardingError(err.error || 'Error al crear restaurante')
      }
    } catch {
      setOnboardingError('Error de red')
    } finally {
      setOnboardingLoading(false)
    }
  }

  const handleToggleBlock = async (restaurant: RestaurantItem) => {
    setBlockLoading(restaurant.id)
    try {
      const newStatus = restaurant.subscriptionStatus === 'suspended' ? 'trial' : 'suspended'
      const res = await fetch('/api/restaurants', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: restaurant.id, subscriptionStatus: newStatus }),
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        toast.success(newStatus === 'suspended' ? 'Restaurante bloqueado' : 'Restaurante desbloqueado')
        fetchRestaurants()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al cambiar estado')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setBlockLoading(null)
    }
  }

  const handleDeleteRestaurant = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/restaurants/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        toast.success('Restaurante eliminado')
        setDeleteTarget(null)
        setLoading(true)
        fetchRestaurants()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al eliminar restaurante')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setDeleteLoading(false)
    }
  }

  // "Ver restaurante" — enter that restaurant's context with full admin tabs
  const [saActiveTab, setSaActiveTab] = useState<string>('dashboard')
  const viewedRestaurant = restaurants.find((r) => r.id === viewRestaurantId)

  if (viewRestaurantId) {
    const saTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
      { id: 'users', label: 'Usuarios', icon: <Users className="size-4" /> },
      { id: 'tables', label: 'Mesas', icon: <UtensilsCrossed className="size-4" /> },
      { id: 'products', label: 'Productos', icon: <Package className="size-4" /> },
      { id: 'orders', label: 'Pedidos', icon: <Receipt className="size-4" /> },
      { id: 'clients', label: 'Clientes', icon: <UserCircle className="size-4" /> },
    ]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setViewRestaurantId(null)} className="gap-1">
              <ArrowLeft className="size-4" />
              Volver a Restaurantes
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-amber-600" />
            <span className="font-bold text-lg">{viewedRestaurant?.name ?? 'Restaurante'}</span>
          </div>
        </div>
        <Tabs value={saActiveTab} onValueChange={setSaActiveTab}>
          <TabsList className="h-10 bg-muted p-1">
            {saTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-8 data-[state=active]:bg-background gap-1 text-xs font-medium px-3"
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <DashboardTab overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersTab overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="tables" className="mt-4">
            <TablesTab overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <ProductsTab overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="orders" className="mt-4">
            <OrdersTab overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="clients" className="mt-4">
            <ClientsTab overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-44" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="size-5 text-amber-600" />
            Restaurantes
          </h2>
          <p className="text-sm text-muted-foreground">
            {restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <Button onClick={() => setShowOnboardingDialog(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <Plus className="size-4" />
          Crear Restaurante
        </Button>
      </div>

      {/* Restaurant List */}
      {restaurants.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center text-muted-foreground">
            <Building2 className="size-12 mb-3 opacity-30" />
            <p className="font-semibold">No hay restaurantes</p>
            <p className="text-sm">Crea el primer restaurante para empezar</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r) => {
            const isSuspended = r.subscriptionStatus === 'suspended'
            return (
              <Card key={r.id} className={isSuspended ? 'opacity-60 border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{r.name}</p>
                        {isSuspended ? (
                          <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 text-xs">Activo</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Flame className="size-3" />{r.slug}</span>
                        {r.address && <span>{r.address}</span>}
                        {r.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{r.phone}</span>}
                      </div>
                      {r._count && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{r._count.products || 0} productos</span>
                          <span>{r._count.users || 0} usuarios</span>
                          <span>{r._count.orders || 0} pedidos</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => setViewRestaurantId(r.id)}
                      >
                        <Eye className="size-3.5" />
                        Ver
                      </Button>
                      <Button
                        variant={isSuspended ? 'outline' : 'secondary'}
                        size="sm"
                        className={`h-8 gap-1 text-xs ${isSuspended ? '' : 'text-amber-700'}`}
                        onClick={() => handleToggleBlock(r)}
                        disabled={blockLoading === r.id}
                      >
                        {blockLoading === r.id ? (
                          <span className="size-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                        ) : isSuspended ? (
                          <><Shield className="size-3.5" /> Desbloquear</>
                        ) : (
                          <><ShieldOff className="size-3.5" /> Bloquear</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Onboarding Dialog */}
      <Dialog open={showOnboardingDialog} onOpenChange={setShowOnboardingDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-amber-600" />
              Nuevo Restaurante
            </DialogTitle>
            <DialogDescription>
              Crea un nuevo restaurante y su administrador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del restaurante *</Label>
              <Input
                placeholder="Ej: La Bartola"
                value={onboardingForm.name}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                placeholder="la-bartola"
                value={onboardingForm.slug}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={onboardingForm.address}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={onboardingForm.phone}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <p className="font-semibold flex items-center gap-2"><Users className="size-4" /> Administrador</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Juan García"
                  value={onboardingForm.adminName}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, adminName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuario *</Label>
                <Input
                  placeholder="admin"
                  value={onboardingForm.adminUsername}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, adminUsername: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={onboardingForm.adminPassword}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, adminPassword: e.target.value })}
              />
            </div>
            {onboardingError && (
              <p className="text-sm text-red-600 text-center">{onboardingError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardingDialog(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={onboardingLoading || !onboardingForm.name || !onboardingForm.slug || !onboardingForm.adminUsername || !onboardingForm.adminPassword}
              onClick={handleOnboarding}
            >
              {onboardingLoading ? 'Creando...' : 'Crear Restaurante'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar restaurante?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteTarget?.name}</strong> y todos sus datos asociados (productos, usuarios, pedidos, etc.). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteLoading}
              onClick={handleDeleteRestaurant}
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Role / Status helpers ─────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  encargado: 'Encargado',
  camarero: 'Camarero',
  cocina: 'Cocina',
  caja: 'Caja',
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-red-100 text-red-800 border-red-200',
  encargado: 'bg-blue-100 text-blue-800 border-blue-200',
  camarero: 'bg-green-100 text-green-800 border-green-200',
  cocina: 'bg-orange-100 text-orange-800 border-orange-200',
  caja: 'bg-amber-100 text-amber-800 border-amber-200',
}

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  in_progress: { label: 'En preparación', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  ready: { label: 'Listo', color: 'bg-green-100 text-green-800 border-green-200' },
  served: { label: 'Servido', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid: { label: 'Pagado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200' },
}

// ─── DASHBOARD TAB ──────────────────────────────────────────────────────────

function DashboardTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
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

  const { stats, topProducts, lowStockProducts, recentOrders, ordersByStatus } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <Button variant="outline" size="sm" className="h-9" onClick={fetchDashboard}>
          <Clock className="size-4 mr-1" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Receipt className="size-4" />
              <span className="text-xs font-medium">Pedidos hoy</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalOrdersToday}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Euro className="size-4" />
              <span className="text-xs font-medium">Ingresos hoy</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatEUR(stats.revenueToday)}</p>
          </CardContent>
        </Card>
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
            <CardTitle className="text-base">Top productos hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos de ventas hoy</p>
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
            <CardTitle className="text-base">Últimos pedidos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay pedidos</p>
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

// ─── USERS TAB ──────────────────────────────────────────────────────────────

function UsersTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Create user form
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('camarero')
  const [formZone, setFormZone] = useState<string>('')
  const [formActive, setFormActive] = useState(true)
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState(false)

  const canCreate = currentUser && clientHasPermission(currentUser.role, 'users:create')
  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'users:update')
  const canDelete = currentUser && clientHasPermission(currentUser.role, 'users:delete')

  const fetchUsers = useCallback(async () => {
    try {
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/users', { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setUsers(json.users)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, overrideRestaurantId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreateUser = async () => {
    if (!formUsername || !formPassword || !formName) {
      toast.error('Completa todos los campos obligatorios')
      return
    }
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        username: formUsername,
        password: formPassword,
        name: formName,
        role: formRole,
        active: formActive,
        mustChangePassword: true,
      }
      if (overrideRestaurantId) body.restaurantId = overrideRestaurantId
      if (formRole === 'camarero' && formZone) {
        body.zone = formZone
      }
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Usuario creado correctamente')
        setShowCreateDialog(false)
        setFormUsername('')
        setFormPassword('')
        setFormName('')
        setFormRole('camarero')
        setFormZone('')
        setFormActive(true)
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al crear usuario')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (user: UserItem) => {
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: user.id, active: !user.active }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success(user.active ? 'Usuario desactivado' : 'Usuario activado')
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar usuario')
      }
    } catch {
      toast.error('Error de red')
    }
  }

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return
    setResetting(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/users/${resetUserId}/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newPassword }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Contraseña restablecida')
        setShowResetDialog(false)
        setResetUserId(null)
        setNewPassword('')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al restablecer contraseña')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setResetting(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

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
        <h2 className="text-2xl font-bold tracking-tight">Equipo</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-48"
            />
          </div>
          {canCreate && (
            <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className={`rounded-xl ${!user.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-base">{user.name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex items-center gap-1">
                  {canUpdate && user.id !== currentUser?.userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => handleToggleActive(user)}
                      title={user.active ? 'Desactivar' : 'Activar'}
                    >
                      {user.active ? <Shield className="size-4 text-green-600" /> : <ShieldOff className="size-4 text-red-400" />}
                    </Button>
                  )}
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => { setResetUserId(user.id); setShowResetDialog(true) }}
                      title="Restablecer contraseña"
                    >
                      <Lock className="size-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={roleColors[user.role] ?? 'bg-gray-100 text-gray-800'}>
                  {roleLabels[user.role] ?? user.role}
                </Badge>
                {user.zone && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700">
                    {zoneConfig[user.zone]?.label ?? user.zone}
                  </Badge>
                )}
                {user.mustChangePassword && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Lock className="size-3 mr-1" />
                    Cambio pendiente
                  </Badge>
                )}
                {!user.active && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactivo</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            No se encontraron usuarios
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Crea un nuevo miembro del equipo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de usuario *</Label>
              <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="usuario" />
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••" />
            </div>
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Juan García" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currentUser?.role === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && <SelectItem value="admin">Administrador</SelectItem>}
                  <SelectItem value="encargado">Encargado</SelectItem>
                  <SelectItem value="camarero">Camarero</SelectItem>
                  <SelectItem value="cocina">Cocina</SelectItem>
                  <SelectItem value="caja">Caja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formRole === 'camarero' && (
              <div className="space-y-2">
                <Label>Zona</Label>
                <Select value={formZone} onValueChange={setFormZone}>
                  <SelectTrigger><SelectValue placeholder="Sin zona asignada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Barra</SelectItem>
                    <SelectItem value="main">Salón</SelectItem>
                    <SelectItem value="terrace">Terraza</SelectItem>
                    <SelectItem value="private">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="userActive"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="userActive">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateUser} disabled={creating}>
              {creating ? 'Creando...' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>El usuario deberá cambiarla en su próximo inicio de sesión</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResetDialog(false); setResetUserId(null); setNewPassword('') }}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleResetPassword} disabled={resetting || !newPassword}>
              {resetting ? 'Restableciendo...' : 'Restablecer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── TABLES TAB ─────────────────────────────────────────────────────────────

function TablesTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [tables, setTables] = useState<TableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTable, setEditingTable] = useState<TableItem | null>(null)

  // Create form
  const [formNumber, setFormNumber] = useState('')
  const [formCapacity, setFormCapacity] = useState('4')
  const [formZone, setFormZone] = useState('main')
  const [formNotes, setFormNotes] = useState('')
  const [creating, setCreating] = useState(false)

  // Bulk create form
  const [bulkZone, setBulkZone] = useState('main')
  const [bulkStart, setBulkStart] = useState('1')
  const [bulkCount, setBulkCount] = useState('5')
  const [bulkCapacity, setBulkCapacity] = useState('4')
  const [bulkCreating, setBulkCreating] = useState(false)

  // Edit form
  const [editNumber, setEditNumber] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [editZone, setEditZone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const canCreate = currentUser && clientHasPermission(currentUser.role, 'tables:create')
  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'tables:update')
  const canDelete = currentUser && clientHasPermission(currentUser.role, 'tables:delete')

  const fetchTables = useCallback(async () => {
    try {
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/tables', { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setTables(json.tables)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, overrideRestaurantId])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const handleCreateTable = async () => {
    if (!formNumber || !formCapacity) {
      toast.error('Número y capacidad son obligatorios')
      return
    }
    setCreating(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: parseInt(formNumber),
          capacity: parseInt(formCapacity),
          zone: formZone,
          notes: formNotes,
        }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Mesa creada')
        setShowCreateDialog(false)
        setFormNumber('')
        setFormCapacity('4')
        setFormNotes('')
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al crear mesa')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setCreating(false)
    }
  }

  const handleBulkCreate = async () => {
    const start = parseInt(bulkStart)
    const count = parseInt(bulkCount)
    const cap = parseInt(bulkCapacity)
    if (!start || !count || !cap || count > 50) {
      toast.error('Valores no válidos (máximo 50 mesas)')
      return
    }
    setBulkCreating(true)
    let created = 0
    try {
      for (let i = 0; i < count; i++) {
        const headers = authHeaders()
        if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
        const res = await fetch('/api/tables', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: start + i,
            capacity: cap,
            zone: bulkZone,
            notes: '',
          }),
        })
        if (res.ok) created++
      }
      toast.success(`${created} mesas creadas en ${zoneConfig[bulkZone]?.label ?? bulkZone}`)
      setShowBulkDialog(false)
      fetchTables()
    } catch {
      toast.error('Error de red')
    } finally {
      setBulkCreating(false)
    }
  }

  const handleEditTable = async () => {
    if (!editingTable) return
    setSaving(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          number: parseInt(editNumber),
          capacity: parseInt(editCapacity),
          zone: editZone,
          notes: editNotes,
          active: editActive,
        }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Mesa actualizada')
        setShowEditDialog(false)
        setEditingTable(null)
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar mesa')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTable = async (table: TableItem) => {
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/tables/${table.id}`, {
        method: 'DELETE',
        headers,
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Mesa eliminada')
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al eliminar mesa')
      }
    } catch {
      toast.error('Error de red')
    }
  }

  const openEditDialog = (table: TableItem) => {
    setEditingTable(table)
    setEditNumber(String(table.number))
    setEditCapacity(String(table.capacity))
    setEditZone(table.zone)
    setEditNotes(table.notes || '')
    setEditActive(table.active)
    setShowEditDialog(true)
  }

  // Group tables by zone
  const tablesByZone = zoneOrder
    .map((z) => ({
      zone: z,
      config: zoneConfig[z],
      zoneTables: tables.filter((t) => t.zone === z),
    }))

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
        <h2 className="text-2xl font-bold tracking-tight">Mesas</h2>
        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <Button size="sm" variant="outline" className="h-9" onClick={() => setShowBulkDialog(true)}>
                <Plus className="size-4 mr-1" />
                Crear por zona
              </Button>
              <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}>
                <Plus className="size-4 mr-1" />
                Nueva mesa
              </Button>
            </>
          )}
        </div>
      </div>

      {tables.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center">
            <Utensils className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No hay mesas configuradas</p>
            {canCreate && (
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowBulkDialog(true)}>
                <Plus className="size-4 mr-1" />
                Configurar Mesas
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        tablesByZone.map(({ zone, config: cfg, zoneTables }) => (
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
                return (
                  <div
                    key={table.id}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 min-h-[90px] ${
                      !table.active
                        ? 'bg-gray-100 border-gray-200 opacity-60'
                        : isOccupied
                        ? 'bg-orange-50 border-orange-300'
                        : isAvailable
                        ? 'bg-green-50 border-green-300'
                        : 'bg-amber-50 border-amber-300'
                    }`}
                  >
                    <span className="text-2xl font-bold">{table.number}</span>
                    <span className="text-xs text-muted-foreground">{table.capacity} pax</span>
                    {!table.active && <span className="text-xs text-red-500">Inactiva</span>}
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {canUpdate && (
                        <button className="p-1 rounded hover:bg-white/60" onClick={() => openEditDialog(table)}>
                          <Pencil className="size-3 text-muted-foreground" />
                        </button>
                      )}
                      {canDelete && (
                        <button className="p-1 rounded hover:bg-white/60" onClick={() => handleDeleteTable(table)}>
                          <Trash2 className="size-3 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Create Table Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva mesa</DialogTitle>
            <DialogDescription>Añade una mesa al restaurante</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input type="number" value={formNumber} onChange={(e) => setFormNumber(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Capacidad *</Label>
                <Input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} placeholder="4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select value={formZone} onValueChange={setFormZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zoneOrder.map((z) => (
                    <SelectItem key={z} value={z}>{zoneConfig[z]?.label ?? z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Ventana, junto a la barra..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateTable} disabled={creating}>
              {creating ? 'Creando...' : 'Crear mesa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear mesas por zona</DialogTitle>
            <DialogDescription>Crea múltiples mesas de una vez para una zona</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select value={bulkZone} onValueChange={setBulkZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zoneOrder.map((z) => (
                    <SelectItem key={z} value={z}>{zoneConfig[z]?.label ?? z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nº inicio</Label>
                <Input type="number" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} placeholder="5" />
              </div>
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input type="number" value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} placeholder="4" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se crearán {bulkCount || 0} mesas numeradas de la {bulkStart || 0} a la {(parseInt(bulkStart) || 0) + (parseInt(bulkCount) || 0) - 1} en {zoneConfig[bulkZone]?.label ?? bulkZone}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleBulkCreate} disabled={bulkCreating}>
              {bulkCreating ? 'Creando...' : `Crear ${bulkCount || 0} mesas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar mesa {editingTable?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input type="number" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select value={editZone} onValueChange={setEditZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zoneOrder.map((z) => (
                    <SelectItem key={z} value={z}>{zoneConfig[z]?.label ?? z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editActive"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="editActive">Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEditTable} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ORDERS TAB ─────────────────────────────────────────────────────────────

function OrdersTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
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

// ─── CLIENTS TAB ────────────────────────────────────────────────────────────

function ClientsTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Create form
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const canCreate = currentUser && clientHasPermission(currentUser.role, 'clients:create')
  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'clients:update')
  const canDelete = currentUser && clientHasPermission(currentUser.role, 'clients:delete')

  const fetchClients = useCallback(async () => {
    try {
      const url = searchQuery ? `/api/clients?search=${encodeURIComponent(searchQuery)}` : '/api/clients'
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(url, { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setClients(json.clients)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, searchQuery, overrideRestaurantId])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleCreateClient = async () => {
    if (!formName || !formPhone) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }
    setCreating(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: formName, phone: formPhone, email: formEmail, notes: formNotes }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Cliente creado')
        setShowCreateDialog(false)
        setFormName('')
        setFormPhone('')
        setFormEmail('')
        setFormNotes('')
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al crear cliente')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setCreating(false)
    }
  }

  const handleEditClient = async () => {
    if (!editingClient) return
    setSaving(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: editName, phone: editPhone, email: editEmail, notes: editNotes }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Cliente actualizado')
        setShowEditDialog(false)
        setEditingClient(null)
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar cliente')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClient = async (client: Client) => {
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
        headers,
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Cliente eliminado')
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al eliminar cliente')
      }
    } catch {
      toast.error('Error de red')
    }
  }

  const openEditDialog = (client: Client) => {
    setEditingClient(client)
    setEditName(client.name)
    setEditPhone(client.phone)
    setEditEmail(client.email || '')
    setEditNotes(client.notes || '')
    setShowEditDialog(true)
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
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-56"
            />
          </div>
          {canCreate && (
            <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Clients list */}
      {clients.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            No se encontraron clientes
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-base">{client.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="size-3" />{client.phone}
                        </span>
                      )}
                    </div>
                    {client.email && (
                      <span className="text-xs text-muted-foreground">{client.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {canUpdate && (
                      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => openEditDialog(client)}>
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleDeleteClient(client)}>
                        <Trash2 className="size-3.5 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="size-3" />{client.points} pts</span>
                  <span className="flex items-center gap-1"><UserCircle className="size-3" />{client.visits} visitas</span>
                  {client._count && <span className="flex items-center gap-1"><Receipt className="size-3" />{client._count.orders} pedidos</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Client Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>Añade un nuevo cliente al restaurante</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="María López" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="612345678" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="maria@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Alergias, preferencias..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateClient} disabled={creating}>
              {creating ? 'Creando...' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEditClient} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  const { activeTab, setActiveTab, realtimeConnected, setRealtimeConnected } = useRestaurantStore()

  // ─── Auth State ────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ userId: string; username: string; role: string; name: string; restaurantId?: string; mustChangePassword?: boolean } | null>(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // ─── Must Change Password State ──────────────────────────────
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)
  const [changePasswordCurrent, setChangePasswordCurrent] = useState('')
  const [changePasswordNew, setChangePasswordNew] = useState('')
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('')
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')

  // ─── SaaS Subscription State ────────────────────────────────
  const [subscriptionSuspended, setSubscriptionSuspended] = useState(false)

  // ─── Inactivity Auto-Close (10 minutes) ─────────────────────
  const INACTIVITY_MS = 10 * 60 * 1000 // 10 minutes
  const lastActivityRef = useRef<number>(Date.now())

  // Reset activity timer on user interaction
  useEffect(() => {
    if (!authToken) return

    const resetTimer = () => {
      lastActivityRef.current = Date.now()
      localStorage.setItem('restaurantos_last_activity', String(Date.now()))
    }

    // Initialize from stored last activity
    const stored = localStorage.getItem('restaurantos_last_activity')
    if (stored) {
      lastActivityRef.current = parseInt(stored, 10)
    } else {
      resetTimer()
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }))

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer))
    }
  }, [authToken])

  // Check inactivity every 30 seconds
  useEffect(() => {
    if (!authToken) return

    // Check immediately on mount if session should be expired
    const stored = localStorage.getItem('restaurantos_last_activity')
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10)
      if (elapsed >= INACTIVITY_MS) {
        setAuthToken(null)
        setCurrentUser(null)
        localStorage.removeItem('restaurantos_auth')
        localStorage.removeItem('restaurantos_last_activity')
        toast.error('Sesión cerrada por inactividad (10 min)')
        return
      }
    }

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= INACTIVITY_MS) {
        setAuthToken(null)
        setCurrentUser(null)
        localStorage.removeItem('restaurantos_auth')
        localStorage.removeItem('restaurantos_last_activity')
        toast.error('Sesión cerrada por inactividad (10 min)')
      }
    }, 30_000)

    return () => clearInterval(checkInterval)
  }, [authToken, INACTIVITY_MS])

  // Load auth from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('restaurantos_auth')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Check if token is expired before using it
        if (parsed.token) {
          try {
            const base64Url = parsed.token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            )
            const { exp } = JSON.parse(jsonPayload)
            if (exp && exp * 1000 > Date.now()) {
              setAuthToken(parsed.token)
              setCurrentUser(parsed.user)
            } else if (parsed.refreshToken) {
              // Try to refresh the token
              fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: parsed.refreshToken }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.token) {
                    const userData = { userId: data.user.id, username: data.user.username, name: data.user.name, role: data.user.role, zone: data.user.zone ?? null, restaurantId: data.user.restaurantId, mustChangePassword: data.mustChangePassword ?? data.user.mustChangePassword ?? false }
                    setAuthToken(data.token)
                    setCurrentUser(userData)
                    localStorage.setItem('restaurantos_auth', JSON.stringify({ token: data.token, refreshToken: data.refreshToken, user: userData }))
                  } else {
                    localStorage.removeItem('restaurantos_auth')
                  }
                })
                .catch(() => localStorage.removeItem('restaurantos_auth'))
            } else {
              localStorage.removeItem('restaurantos_auth')
            }
          } catch {
            // If token parsing fails, still try to use it
            setAuthToken(parsed.token)
            setCurrentUser(parsed.user)
          }
        }
      } catch { /* ignore */ }
    }
  }, [])

  const authHeaders = useCallback((contentType = true) => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    if (currentUser?.restaurantId) headers['X-Restaurant-Id'] = currentUser.restaurantId
    return headers
  }, [authToken, currentUser?.restaurantId])

  const handleFetchResponse = useCallback((res: Response) => {
    if (res.status === 401) {
      setAuthToken(null)
      setCurrentUser(null)
      localStorage.removeItem('restaurantos_auth')
      localStorage.removeItem('restaurantos_last_activity')
      toast.error('Sesión expirada')
      return false
    }
    return true
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setCurrentUser(null)
    localStorage.removeItem('restaurantos_auth')
    localStorage.removeItem('restaurantos_last_activity')
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        const userData = { userId: data.user.id, username: data.user.username, name: data.user.name, role: data.user.role, restaurantId: data.user.restaurantId, mustChangePassword: data.mustChangePassword ?? data.user.mustChangePassword ?? false }
        setAuthToken(data.token)
        setCurrentUser(userData)
        localStorage.setItem('restaurantos_auth', JSON.stringify({ token: data.token, refreshToken: data.refreshToken, user: userData }))
        setLoginUsername('')
        setLoginPassword('')
        // Check must change password
        if (userData.mustChangePassword) {
          setShowChangePasswordDialog(true)
        }
      } else {
        setLoginError(data.error || 'Error al iniciar sesión')
      }
    } catch {
      setLoginError('Error de red')
    } finally {
      setLoginLoading(false)
    }
  }

  // Real-time status: always "connected" (polling mode, no Socket.io)
  useEffect(() => {
    if (!authToken) return
    setRealtimeConnected(true)
  }, [authToken, setRealtimeConnected])

  // Fetch restaurant info to check subscription status
  useEffect(() => {
    if (!authToken || !currentUser?.restaurantId) return
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${currentUser.restaurantId}`, { headers: authHeaders(false) })
        if (res.ok) {
          const data = await res.json()
          setSubscriptionSuspended(data.subscriptionStatus === 'suspended' || data.restaurant?.subscriptionStatus === 'suspended')
        }
      } catch { /* silently fail */ }
    }
    fetchRestaurant()
  }, [authToken, currentUser?.restaurantId, authHeaders])

  const mainTabs = [
    { id: 'camarero' as TabId, label: 'Camarero', icon: <Utensils className="size-4" /> },
    { id: 'cocina' as TabId, label: 'Cocina', icon: <ChefHat className="size-4" /> },
    { id: 'caja' as TabId, label: 'Caja', icon: <CreditCard className="size-4" /> },
  ]

  // Filter main tabs by permissions
  const visibleMainTabs = mainTabs.filter((tab) => {
    if (!currentUser) return false
    switch (tab.id) {
      case 'camarero': return clientHasPermission(currentUser.role, 'orders:create')
      case 'cocina': return clientHasPermission(currentUser.role, 'orders:update')
      case 'caja': return clientHasPermission(currentUser.role, 'orders:pay') || clientHasPermission(currentUser.role, 'cash:read')
      default: return true
    }
  })

  const adminTabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { id: 'users' as TabId, label: 'Usuarios', icon: <Users className="size-4" /> },
    { id: 'tables' as TabId, label: 'Mesas', icon: <UtensilsCrossed className="size-4" /> },
    { id: 'products' as TabId, label: 'Productos', icon: <Package className="size-4" /> },
    { id: 'orders' as TabId, label: 'Pedidos', icon: <Receipt className="size-4" /> },
    { id: 'clients' as TabId, label: 'Clientes', icon: <UserCircle className="size-4" /> },
  ]

  // Filter admin tabs by permissions
  const visibleAdminTabs = adminTabs.filter((tab) => {
    if (!currentUser) return false
    switch (tab.id) {
      case 'dashboard': return clientHasPermission(currentUser.role, 'dashboard:read')
      case 'users': return clientHasPermission(currentUser.role, 'users:read')
      case 'tables': return clientHasPermission(currentUser.role, 'tables:read')
      case 'products': return clientHasPermission(currentUser.role, 'products:read')
      case 'orders': return clientHasPermission(currentUser.role, 'orders:read')
      case 'clients': return clientHasPermission(currentUser.role, 'clients:read')
      default: return true
    }
  })

  // Roles that can access the reportes tab
  const canAccessReportes = currentUser && ['super_admin', 'admin', 'encargado'].includes(currentUser.role)

  // ─── Login Screen ──────────────────────────────────────────────
  if (!authToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <Card className="w-full max-w-sm rounded-2xl shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 mb-3">
              <Flame className="size-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-amber-800">RestaurantOS</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Inicia sesión para continuar</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="usuario"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-600 text-center">{loginError}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white text-base font-semibold"
                disabled={loginLoading}
              >
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Authenticated App ─────────────────────────────────────────
  return (
    <AuthContext.Provider value={{ authToken, currentUser, authHeaders, handleFetchResponse, logout }}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Suspended subscription banner */}
        {subscriptionSuspended && currentUser?.role !== 'super_admin' && (
          <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="size-4" />
            Restaurante suspendido. Contacte al administrador del sistema.
          </div>
        )}

        {/* Must Change Password Dialog */}
        <Dialog open={showChangePasswordDialog} onOpenChange={() => { /* unclosable */ }}>
          <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="size-5 text-amber-600" />
                Cambio de contraseña requerido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Contraseña actual</Label>
                <Input type="password" value={changePasswordCurrent} onChange={(e) => setChangePasswordCurrent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input type="password" value={changePasswordNew} onChange={(e) => setChangePasswordNew(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nueva contraseña</Label>
                <Input type="password" value={changePasswordConfirm} onChange={(e) => setChangePasswordConfirm(e.target.value)} />
              </div>
              {changePasswordError && (
                <p className="text-sm text-red-600 text-center">{changePasswordError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={changePasswordLoading || !changePasswordCurrent || !changePasswordNew || !changePasswordConfirm}
                onClick={async () => {
                  setChangePasswordError('')
                  if (changePasswordNew !== changePasswordConfirm) {
                    setChangePasswordError('Las contraseñas no coinciden')
                    return
                  }
                  if (changePasswordNew.length < 4) {
                    setChangePasswordError('La contraseña debe tener al menos 4 caracteres')
                    return
                  }
                  setChangePasswordLoading(true)
                  try {
                    const res = await fetch('/api/users/change-password', {
                      method: 'POST',
                      headers: authHeaders(),
                      body: JSON.stringify({ currentPassword: changePasswordCurrent, newPassword: changePasswordNew }),
                    })
                    if (res.ok) {
                      toast.success('Contraseña cambiada correctamente')
                      const updatedUser = { ...currentUser!, mustChangePassword: false }
                      setCurrentUser(updatedUser)
                      localStorage.setItem('restaurantos_auth', JSON.stringify({ token: authToken, refreshToken: JSON.parse(localStorage.getItem('restaurantos_auth') || '{}').refreshToken, user: updatedUser }))
                      setShowChangePasswordDialog(false)
                      setChangePasswordCurrent('')
                      setChangePasswordNew('')
                      setChangePasswordConfirm('')
                    } else {
                      const err = await res.json()
                      setChangePasswordError(err.error || 'Error al cambiar contraseña')
                    }
                  } catch {
                    setChangePasswordError('Error de red')
                  } finally {
                    setChangePasswordLoading(false)
                  }
                }}
              >
                {changePasswordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              {currentUser && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs">
                  <UserCircle className="size-3 mr-1" />
                  {currentUser.name} · {currentUser.role}
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-red-600" onClick={logout}>
                <LogOut className="size-4 mr-1" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </header>

        {/* ─── SUPER ADMIN VIEW ─── */}
        {currentUser?.role === 'super_admin' ? (
          <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-4">
            <SuperAdminPanel />
          </main>
        ) : (
          /* ─── REGULAR USER VIEW (tabs) ─── */
          <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
              {/* Main tabs */}
              <div className="mb-4">
                <TabsList className="h-12 bg-amber-100/60 p-1">
                  {visibleMainTabs.map((tab) => (
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
              {visibleAdminTabs.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Administración</p>
                <TabsList className="h-9 bg-muted p-0.5">
                  {visibleAdminTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-8 data-[state=active]:bg-background gap-1 text-xs font-medium px-3"
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                  {canAccessReportes && (
                    <TabsTrigger
                      value="reportes"
                      className="h-8 data-[state=active]:bg-background gap-1 text-xs font-medium px-3"
                    >
                      <BarChart3 className="size-3.5" />
                      <span className="hidden sm:inline">Reportes</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              )}

              <TabsContent value="dashboard" className="mt-2">
                <DashboardTab />
              </TabsContent>

              <TabsContent value="users" className="mt-2">
                <UsersTab />
              </TabsContent>

              <TabsContent value="products" className="mt-2">
                <ProductsTab />
              </TabsContent>

              <TabsContent value="tables" className="mt-2">
                <TablesTab />
              </TabsContent>

              <TabsContent value="orders" className="mt-2">
                <OrdersTab />
              </TabsContent>

              <TabsContent value="clients" className="mt-2">
                <ClientsTab />
              </TabsContent>

              <TabsContent value="reportes" className="mt-2">
                <ReportesTab />
              </TabsContent>
            </Tabs>
          </main>
        )}
      </div>
    </AuthContext.Provider>
  )
}
