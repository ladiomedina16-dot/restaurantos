'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  Settings,
  Wifi,
  WifiOff,
  Bell,
  Flame,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChefHat,
  Utensils,
  Receipt,
  XCircle,
  Minus,
  ChevronRight,
  Phone,
  Mail,
  Star,
  CalendarDays,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table as TableComp,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useRestaurantStore, type TabId } from '@/lib/store'
import { getSocket, disconnectSocket } from '@/lib/socket'
import { toast } from 'sonner'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

const formatDateTime = (dateStr: string) =>
  `${formatDate(dateStr)} ${formatTime(dateStr)}`

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
  product: { id: string; name: string; price: number }
}

interface Order {
  id: string
  tableId: string
  clientId: string | null
  status: string
  total: number
  notes: string
  createdAt: string
  updatedAt: string
  table: { id: string; number: number; zone: string }
  client: { id: string; name: string; phone: string } | null
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
  orders?: Order[]
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
  lowStockProducts: Product[]
  recentOrders: Order[]
  ordersByStatus: { status: string; count: number }[]
  categories: { category: string; count: number }[]
}

// ─── Status Helpers ─────────────────────────────────────────────────────────

const orderStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="size-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <ChefHat className="size-3" /> },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="size-3" /> },
  served: { label: 'Served', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <Utensils className="size-3" /> },
  paid: { label: 'Paid', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <Receipt className="size-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="size-3" /> },
}

const tableStatusConfig: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-green-100 text-green-800 border-green-200' },
  occupied: { label: 'Occupied', color: 'bg-red-100 text-red-800 border-red-200' },
  reserved: { label: 'Reserved', color: 'bg-amber-100 text-amber-800 border-amber-200' },
}

const categoryLabels: Record<string, string> = {
  bebida: 'Bebida',
  comida: 'Comida',
  postre: 'Postre',
  general: 'General',
}

const zoneLabels: Record<string, string> = {
  main: 'Main',
  terrace: 'Terrace',
  private: 'Private',
  bar: 'Bar',
}

const orderStatusFlow = ['pending', 'in_progress', 'ready', 'served', 'paid']

// ─── Dashboard Tab ──────────────────────────────────────────────────────────

function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) return <p className="text-muted-foreground">Failed to load dashboard data.</p>

  const { stats, recentOrders, lowStockProducts, topProducts } = data

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-amber-600" />
              <span className="text-sm font-medium text-muted-foreground">Orders Today</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stats.totalOrdersToday}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Receipt className="size-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Revenue Today</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(stats.revenueToday)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="size-5 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Occupied Tables</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stats.occupiedTables}<span className="text-lg text-muted-foreground">/{stats.totalActiveTables}</span></p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-600" />
              <span className="text-sm font-medium text-muted-foreground">Low Stock Products</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stats.lowStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Recent Orders */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No recent orders.</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const sc = orderStatusConfig[order.status]
                    return (
                      <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Table {order.table?.number ?? '?'}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)} · {(order._count?.items ?? order.items?.length ?? 0)} items</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{formatCurrency(order.total)}</span>
                          {sc && <Badge variant="outline" className={sc.color}><span className="mr-1">{sc.icon}</span>{sc.label}</Badge>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Low Stock + Top Products */}
        <div className="space-y-4">
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="size-5 text-orange-600" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">All products are well-stocked!</p>
              ) : (
                <ScrollArea className="max-h-40">
                  <div className="space-y-2">
                    {lowStockProducts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border p-2">
                        <span className="text-sm">{p.name}</span>
                        <Badge variant="outline" className={p.stock === 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-orange-100 text-orange-800 border-orange-200'}>
                          {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="size-5 text-amber-600" />
                Top Products Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No sales data yet today.</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((tp, idx) => (
                    <div key={tp.productId} className="flex items-center justify-between rounded-lg border p-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">{idx + 1}</span>
                        <span className="text-sm">{tp.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(tp.totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">{tp.totalQuantity} sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Products Tab ───────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formStock, setFormStock] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const json = await res.json()
        setProducts(json.products.filter((p: Product) => p.active))
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormCategory('general')
    setFormStock('')
    setFormImageUrl('')
    setEditingProduct(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setFormName(product.name)
    setFormDescription(product.description)
    setFormPrice(String(product.price))
    setFormCategory(product.category)
    setFormStock(String(product.stock))
    setFormImageUrl(product.imageUrl)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPrice) {
      toast.error('Name and price are required')
      return
    }

    setSaving(true)
    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim(),
        price: parseFloat(formPrice),
        category: formCategory,
        stock: parseInt(formStock) || 0,
        imageUrl: formImageUrl.trim(),
      }

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product created')
        setDialogOpen(false)
        resetForm()
        fetchProducts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save product')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Product deleted')
        setDeleteId(null)
        fetchProducts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = ['all', 'bebida', 'comida', 'postre', 'general']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage your menu items and categories</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={openCreate}>
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              className={categoryFilter === cat ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? 'All' : (categoryLabels[cat] ?? cat)}
            </Button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No products found. Add your first menu item to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <Card key={product.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize text-xs">
                    {categoryLabels[product.category] ?? product.category}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-amber-700">{formatCurrency(product.price)}</span>
                  <Badge
                    variant="outline"
                    className={product.stock <= 5 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}
                  >
                    Stock: {product.stock}
                  </Badge>
                </div>
                <Separator className="my-3" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(product)}>
                    <Pencil className="size-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(product.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod-name">Name *</Label>
              <Input id="prod-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Product name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea id="prod-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Product description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prod-price">Price (€) *</Label>
                <Input id="prod-price" type="number" step="0.01" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-stock">Stock</Label>
                <Input id="prod-stock" type="number" min="0" value={formStock} onChange={(e) => setFormStock(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bebida">Bebida</SelectItem>
                  <SelectItem value="comida">Comida</SelectItem>
                  <SelectItem value="postre">Postre</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-image">Image URL</Label>
              <Input id="prod-image" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Tables Tab ─────────────────────────────────────────────────────────────

function TablesTab() {
  const [tables, setTables] = useState<TableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [zoneFilter, setZoneFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<TableItem | null>(null)
  const [statusDialogTable, setStatusDialogTable] = useState<TableItem | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const [formNumber, setFormNumber] = useState('')
  const [formCapacity, setFormCapacity] = useState('')
  const [formZone, setFormZone] = useState('main')
  const [formNotes, setFormNotes] = useState('')

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const json = await res.json()
        setTables(json.tables.filter((t: TableItem) => t.active))
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTables() }, [fetchTables])

  const resetForm = () => {
    setFormNumber('')
    setFormCapacity('')
    setFormZone('main')
    setFormNotes('')
    setEditingTable(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (table: TableItem) => {
    setEditingTable(table)
    setFormNumber(String(table.number))
    setFormCapacity(String(table.capacity))
    setFormZone(table.zone)
    setFormNotes(table.notes)
    setDialogOpen(true)
  }

  const openStatusChange = (table: TableItem) => {
    setStatusDialogTable(table)
    setNewStatus(table.status)
  }

  const handleSave = async () => {
    if (!formNumber.trim()) {
      toast.error('Table number is required')
      return
    }
    setSaving(true)
    try {
      const body = {
        number: parseInt(formNumber),
        capacity: parseInt(formCapacity) || 4,
        zone: formZone,
        notes: formNotes.trim(),
      }

      const url = editingTable ? `/api/tables/${editingTable.id}` : '/api/tables'
      const method = editingTable ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(editingTable ? 'Table updated' : 'Table created')
        setDialogOpen(false)
        resetForm()
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save table')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async () => {
    if (!statusDialogTable || !newStatus) return
    try {
      const res = await fetch(`/api/tables/${statusDialogTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success('Table status updated')
        const socket = getSocket()
        socket.emit('table-status-changed', {
          type: 'status_changed',
          table: { ...statusDialogTable, status: newStatus },
          timestamp: new Date().toISOString(),
        })
        setStatusDialogTable(null)
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update status')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const filtered = tables.filter((t) => zoneFilter === 'all' || t.zone === zoneFilter)
  const zones = ['all', 'main', 'terrace', 'private', 'bar']

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tables</h2>
          <p className="text-muted-foreground">Manage table layout and status</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={openCreate}>
          <Plus className="size-4" />
          Add Table
        </Button>
      </div>

      <div className="flex gap-1 flex-wrap">
        {zones.map((z) => (
          <Button
            key={z}
            variant={zoneFilter === z ? 'default' : 'outline'}
            size="sm"
            className={zoneFilter === z ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
            onClick={() => setZoneFilter(z)}
          >
            {z === 'all' ? 'All' : (zoneLabels[z] ?? z)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No tables configured yet. Set up your restaurant floor plan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((table) => {
            const sc = tableStatusConfig[table.status]
            return (
              <Card
                key={table.id}
                className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openStatusChange(table)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-lg">
                        {table.number}
                      </div>
                      <div>
                        <p className="font-semibold">Table {table.number}</p>
                        <p className="text-xs text-muted-foreground capitalize">{zoneLabels[table.zone] ?? table.zone}</p>
                      </div>
                    </div>
                    {sc && <Badge variant="outline" className={sc.color}>{sc.label}</Badge>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Capacity: {table.capacity}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(table) }}>
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Table Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-number">Number *</Label>
                <Input id="table-number" type="number" min="1" value={formNumber} onChange={(e) => setFormNumber(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-capacity">Capacity</Label>
                <Input id="table-capacity" type="number" min="1" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} placeholder="4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zone</Label>
              <Select value={formZone} onValueChange={setFormZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="terrace">Terrace</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-notes">Notes</Label>
              <Textarea id="table-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingTable ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={!!statusDialogTable} onOpenChange={(open) => { if (!open) setStatusDialogTable(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Table Status</DialogTitle>
          </DialogHeader>
          {statusDialogTable && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Table {statusDialogTable.number} — {zoneLabels[statusDialogTable.zone]}
              </p>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogTable(null)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleStatusChange}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Orders Tab ─────────────────────────────────────────────────────────────

function OrdersTab() {
  const { currentOrderItems, addOrderItem, removeOrderItem, updateOrderItemQuantity, clearOrderItems } = useRestaurantStore()

  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<TableItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)

  // New order form
  const [selectedTableId, setSelectedTableId] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [placing, setPlacing] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const json = await res.json()
        setOrders(json.orders)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const json = await res.json()
        setProducts(json.products.filter((p: Product) => p.active))
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const json = await res.json()
        setTables(json.tables.filter((t: TableItem) => t.active))
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const json = await res.json()
        setClients(json.clients)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchProducts()
    fetchTables()
    fetchClients()
  }, [fetchOrders, fetchProducts, fetchTables, fetchClients])

  const handleAddProductToOrder = (product: Product) => {
    addOrderItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      notes: '',
    })
  }

  const currentTotal = currentOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handlePlaceOrder = async () => {
    if (!selectedTableId) {
      toast.error('Please select a table')
      return
    }
    if (currentOrderItems.length === 0) {
      toast.error('Add at least one item')
      return
    }

    setPlacing(true)
    try {
      const body = {
        tableId: selectedTableId,
        clientId: selectedClientId || undefined,
        notes: orderNotes.trim(),
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
        toast.success('Order placed!')
        const socket = getSocket()
        socket.emit('order-created', {
          type: 'created',
          order: json.order,
          timestamp: new Date().toISOString(),
        })
        clearOrderItems()
        setSelectedTableId('')
        setSelectedClientId('')
        setOrderNotes('')
        setShowNewOrder(false)
        fetchOrders()
        fetchProducts()
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to place order')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setPlacing(false)
    }
  }

  const handleStatusChange = async (order: Order, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const json = await res.json()
        toast.success(`Order status → ${orderStatusConfig[newStatus]?.label ?? newStatus}`)
        const socket = getSocket()
        socket.emit('order-status-changed', {
          type: 'status_changed',
          order: json.order,
          timestamp: new Date().toISOString(),
        })
        fetchOrders()
        fetchTables()
        // Update selected order if viewing it
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(json.order)
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update order')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const getNextStatus = (currentStatus: string): string | null => {
    const idx = orderStatusFlow.indexOf(currentStatus)
    if (idx >= 0 && idx < orderStatusFlow.length - 1) {
      return orderStatusFlow[idx + 1]
    }
    return null
  }

  const filteredOrders = orders.filter((o) => statusFilter === 'all' || o.status === statusFilter)
  const availableTables = tables.filter((t) => t.status === 'available')
  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )
  const filteredMenuProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter
    return matchesSearch && matchesCategory
  })

  const orderStatuses = ['all', 'pending', 'in_progress', 'ready', 'served', 'paid', 'cancelled']

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">Track and manage customer orders</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setShowNewOrder(true); setSelectedOrder(null) }}>
          <Plus className="size-4" />
          New Order
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Orders List */}
        <div className="space-y-4">
          <div className="flex gap-1 flex-wrap">
            {orderStatuses.map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === s ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : (orderStatusConfig[s]?.label ?? s)}
              </Button>
            ))}
          </div>

          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="space-y-2">
              {filteredOrders.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">No orders found.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map((order) => {
                  const sc = orderStatusConfig[order.status]
                  const nextStatus = getNextStatus(order.status)
                  const isSelected = selectedOrder?.id === order.id
                  return (
                    <Card
                      key={order.id}
                      className={`rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-amber-500' : ''}`}
                      onClick={() => { setSelectedOrder(order); setShowNewOrder(false) }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Table {order.table?.number ?? '?'}</span>
                              {sc && <Badge variant="outline" className={sc.color}><span className="mr-1">{sc.icon}</span>{sc.label}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(order.createdAt)} · {order.items?.length ?? 0} items
                              {order.client ? ` · ${order.client.name}` : ''}
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="font-bold">{formatCurrency(order.total)}</span>
                            {nextStatus && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(order, nextStatus) }}
                              >
                                <ChevronRight className="size-3 mr-1" />
                                {orderStatusConfig[nextStatus]?.label}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: New Order / Order Details */}
        <div>
          {showNewOrder ? (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">New Order</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewOrder(false)}>
                    <XCircle className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Table & Client Select */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Table *</Label>
                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                      <SelectTrigger><SelectValue placeholder="Select table" /></SelectTrigger>
                      <SelectContent>
                        {availableTables.map((t) => (
                          <SelectItem key={t.id} value={t.id}>Table {t.number} ({zoneLabels[t.zone]})</SelectItem>
                        ))}
                        {availableTables.length === 0 && (
                          <SelectItem value="none" disabled>No tables available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Client (optional)</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Search..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredClients.slice(0, 20).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>
                        ))}
                        <SelectItem value="none">Walk-in (no client)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Order notes..." />
                </div>

                <Separator />

                {/* Product Search & Filter */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search menu..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="bebida">Bebida</SelectItem>
                      <SelectItem value="comida">Comida</SelectItem>
                      <SelectItem value="postre">Postre</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Menu Products */}
                <ScrollArea className="max-h-48">
                  <div className="grid grid-cols-2 gap-2">
                    {filteredMenuProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex items-center justify-between rounded-lg border p-2 text-left hover:bg-amber-50 transition-colors"
                        onClick={() => handleAddProductToOrder(p)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(p.price)}</p>
                        </div>
                        <Plus className="size-4 shrink-0 text-amber-600" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                {/* Current Order Items */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Order Items</h4>
                  {currentOrderItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items added yet. Click products above to add.</p>
                  ) : (
                    <div className="space-y-2">
                      {currentOrderItems.map((item) => (
                        <div key={item.productId} className="flex items-center gap-2 rounded-lg border p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="size-7" onClick={() => updateOrderItemQuantity(item.productId, item.quantity - 1)}>
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="size-7" onClick={() => updateOrderItemQuantity(item.productId, item.quantity + 1)}>
                              <Plus className="size-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-semibold w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
                          <Button variant="ghost" size="icon" className="size-7 text-red-500" onClick={() => removeOrderItem(item.productId)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total & Submit */}
                {currentOrderItems.length > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-amber-700">{formatCurrency(currentTotal)}</span>
                  </div>
                )}

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handlePlaceOrder}
                  disabled={placing || currentOrderItems.length === 0}
                >
                  {placing ? 'Placing...' : `Place Order (${formatCurrency(currentTotal)})`}
                </Button>
              </CardContent>
            </Card>
          ) : selectedOrder ? (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Order Details</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                    <XCircle className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Table {selectedOrder.table?.number ?? '?'}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(selectedOrder.createdAt)}</p>
                    {selectedOrder.client && (
                      <p className="text-sm text-muted-foreground">Client: {selectedOrder.client.name}</p>
                    )}
                  </div>
                  {(() => {
                    const sc = orderStatusConfig[selectedOrder.status]
                    return sc ? <Badge variant="outline" className={sc.color}><span className="mr-1">{sc.icon}</span>{sc.label}</Badge> : null
                  })()}
                </div>

                {selectedOrder.notes && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-sm"><span className="font-medium">Notes:</span> {selectedOrder.notes}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-2">Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{item.product?.name ?? 'Unknown'}</span>
                          <span className="text-muted-foreground ml-1">×{item.quantity}</span>
                        </div>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-amber-700">{formatCurrency(selectedOrder.total)}</span>
                </div>

                {/* Status Change Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const nextStatus = getNextStatus(selectedOrder.status)
                    if (!nextStatus) return null
                    return (
                      <Button
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => handleStatusChange(selectedOrder, nextStatus)}
                      >
                        <ChevronRight className="size-4 mr-1" />
                        Mark as {orderStatusConfig[nextStatus]?.label}
                      </Button>
                    )
                  })()}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'paid' && (
                    <Button variant="destructive" onClick={() => handleStatusChange(selectedOrder, 'cancelled')}>
                      <XCircle className="size-4 mr-1" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center min-h-64 text-center">
                <ShoppingCart className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Select an order to view details or create a new one.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Clients Tab ────────────────────────────────────────────────────────────

function ClientsTab() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/clients${params}`)
      if (res.ok) {
        const json = await res.json()
        setClients(json.clients)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchClients() }, [fetchClients])

  const resetForm = () => {
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormNotes('')
    setEditingClient(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setFormName(client.name)
    setFormPhone(client.phone)
    setFormEmail(client.email)
    setFormNotes(client.notes)
    setDialogOpen(true)
  }

  const openDetail = async (client: Client) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`)
      if (res.ok) {
        const json = await res.json()
        setDetailClient(json.client)
      }
    } catch {
      // silently fail
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        notes: formNotes.trim(),
      }

      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients'
      const method = editingClient ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(editingClient ? 'Client updated' : 'Client created')
        setDialogOpen(false)
        resetForm()
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save client')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/clients/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Client deleted')
        setDeleteId(null)
        if (detailClient?.id === deleteId) setDetailClient(null)
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete client')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const loyaltyProgress = (points: number) => Math.min((points % 50) / 50 * 100, 100)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={openCreate}>
          <Plus className="size-4" />
          Add Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Client List */}
        <div className={detailClient ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {clients.length === 0 ? (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">No clients yet. Add your first customer to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl shadow-sm">
              <TableComp>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Visits</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-amber-50/50"
                      onClick={() => openDetail(client)}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{client.phone}</TableCell>
                      <TableCell className="hidden md:table-cell">{client.email || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          <Star className="size-3 mr-1" />{client.points}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{client.visits}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); openEdit(client) }}>
                            <Pencil className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteId(client.id) }}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableComp>
            </Card>
          )}
        </div>

        {/* Client Detail Panel */}
        {detailClient && (
          <div className="space-y-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{detailClient.name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setDetailClient(null)}>
                    <XCircle className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground" />
                  <span>{detailClient.phone}</span>
                </div>
                {detailClient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <span>{detailClient.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span>Joined {formatDate(detailClient.createdAt)}</span>
                </div>
                {detailClient.notes && (
                  <p className="text-sm text-muted-foreground italic">&quot;{detailClient.notes}&quot;</p>
                )}

                <Separator />

                {/* Loyalty Points */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold flex items-center gap-1"><Star className="size-4 text-amber-600" /> Loyalty Points</span>
                    <span className="text-sm font-bold text-amber-700">{detailClient.points}</span>
                  </div>
                  <Progress value={loyaltyProgress(detailClient.points)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {50 - (detailClient.points % 50)} points until next free drink!
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    1 point per €1 spent. Every 50 points = 1 free drink!
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-amber-50 p-2">
                    <p className="text-xl font-bold text-amber-700">{detailClient.visits}</p>
                    <p className="text-xs text-muted-foreground">Visits</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-2">
                    <p className="text-xl font-bold text-green-700">{detailClient.orders?.length ?? detailClient._count?.orders ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                </div>

                {detailClient.orders && detailClient.orders.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Recent Orders</h4>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-2">
                          {detailClient.orders.slice(0, 5).map((order) => {
                            const sc = orderStatusConfig[order.status]
                            return (
                              <div key={order.id} className="flex items-center justify-between text-sm rounded-lg border p-2">
                                <div>
                                  <p className="font-medium">Table {order.table?.number ?? '?'}</p>
                                  <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{formatCurrency(order.total)}</span>
                                  {sc && <Badge variant="outline" className={`text-xs ${sc.color}`}>{sc.label}</Badge>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Name *</Label>
              <Input id="client-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Client name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Phone *</Label>
              <Input id="client-phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+34 600 000 000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-notes">Notes</Label>
              <Textarea id="client-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Allergies, preferences..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingClient ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone. Clients with active orders cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {detailLoading && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <RefreshCw className="size-6 animate-spin text-amber-600" />
        </div>
      )}
    </div>
  )
}

// ─── Tab Config ─────────────────────────────────────────────────────────────

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { id: 'products', label: 'Products', icon: <Package className="size-4" /> },
  { id: 'tables', label: 'Tables', icon: <UtensilsCrossed className="size-4" /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart className="size-4" /> },
  { id: 'clients', label: 'Clients', icon: <Users className="size-4" /> },
]

// ─── Main Application ──────────────────────────────────────────────────────

export default function Home() {
  const {
    activeTab,
    setActiveTab,
    realtimeConnected,
    setRealtimeConnected,
    notifications,
    addNotification,
    clearNotifications,
  } = useRestaurantStore()

  // Socket.io connection
  useEffect(() => {
    const socket = getSocket()

    const onConnect = () => {
      setRealtimeConnected(true)
      addNotification({ message: 'Real-time connected', type: 'info' })
    }

    const onDisconnect = () => {
      setRealtimeConnected(false)
      addNotification({ message: 'Real-time disconnected', type: 'warning' })
    }

    const onOrderCreated = (data: { order: Order }) => {
      addNotification({ message: `New order for Table ${data.order?.table?.number ?? '?'}`, type: 'success' })
    }

    const onOrderStatusChanged = (data: { order: Order }) => {
      const sc = orderStatusConfig[data.order?.status]
      addNotification({ message: `Order ${data.order?.id?.slice(0, 8)} → ${sc?.label ?? data.order?.status}`, type: 'info' })
    }

    const onTableStatusChanged = (data: { table: TableItem }) => {
      const tc = tableStatusConfig[data.table?.status]
      addNotification({ message: `Table ${data.table?.number} → ${tc?.label ?? data.table?.status}`, type: 'info' })
    }

    const onProductStockUpdated = (data: { product: Product }) => {
      addNotification({ message: `Stock updated: ${data.product?.name} (${data.product?.stock})`, type: 'warning' })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('order-created', onOrderCreated)
    socket.on('order-status-changed', onOrderStatusChanged)
    socket.on('table-status-changed', onTableStatusChanged)
    socket.on('product-stock-updated', onProductStockUpdated)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('order-created', onOrderCreated)
      socket.off('order-status-changed', onOrderStatusChanged)
      socket.off('table-status-changed', onTableStatusChanged)
      socket.off('product-stock-updated', onProductStockUpdated)
      disconnectSocket()
    }
  }, [setRealtimeConnected, addNotification])

  const unreadCount = notifications.length

  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-600 text-white">
              <Flame className="size-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">RestaurantOS</h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={realtimeConnected ? 'secondary' : 'destructive'}
              className="gap-1.5 text-xs"
            >
              {realtimeConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {realtimeConnected ? 'Connected' : 'Offline'}
            </Badge>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b p-4">
                  <h4 className="text-sm font-semibold">Notifications</h4>
                  {notifications.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearNotifications}>
                      Clear all
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-72">
                  {notifications.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                      <p className="text-sm text-muted-foreground">No notifications</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((n) => (
                        <div key={n.id} className="border-b px-4 py-3 last:border-b-0">
                          <p className="text-sm">{n.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon">
              <Settings className="size-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Tab Navigation ─────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabId)}
        className="flex flex-1 flex-col"
      >
        <div className="border-b bg-background">
          <div className="container mx-auto px-4">
            <TabsList className="h-12 w-full justify-start gap-1 bg-transparent p-0 sm:w-auto">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative h-12 gap-2 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-amber-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-amber-700"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* ─── Content Area ──────────────────────────────────────── */}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-6">
            <TabsContent value="dashboard">
              <DashboardTab />
            </TabsContent>
            <TabsContent value="products">
              <ProductsTab />
            </TabsContent>
            <TabsContent value="tables">
              <TablesTab />
            </TabsContent>
            <TabsContent value="orders">
              <OrdersTab />
            </TabsContent>
            <TabsContent value="clients">
              <ClientsTab />
            </TabsContent>
          </div>
        </main>
      </Tabs>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="mt-auto border-t bg-background">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} RestaurantOS. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            v1.0.0
          </p>
        </div>
      </footer>
    </div>
  )
}
