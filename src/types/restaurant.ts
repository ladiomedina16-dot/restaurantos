// ─── RestaurantOS — Shared Type Definitions ────────────────────────────────
// Extracted from src/app/page.tsx during Phase 1 refactor.
// These types represent the shape of data returned by the API
// and used throughout the client-side application.

// ─── Product ───────────────────────────────────────────────────────────────

export interface Product {
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

// ─── Table ─────────────────────────────────────────────────────────────────

export interface TableItem {
  id: string
  number: number
  capacity: number
  status: string
  zone: string
  notes: string
  active: boolean
}

// ─── Order ─────────────────────────────────────────────────────────────────

export interface OrderItemDetail {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes: string
  modifiers: string
  status: string      // pending | ready
  destination: string // bar | kitchen
  product: { id: string; name: string; price: number; category: string }
}

export interface Order {
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
  cancelledById?: string | null
  cancelledAt?: string | null
  createdAt: string
  updatedAt: string
  table: { id: string; number: number; zone: string }
  client: { id: string; name: string; phone: string; points?: number; visits?: number } | null
  items: OrderItemDetail[]
  _count?: { items: number }
  createdBy?: { id: string; username: string; name: string; role: string } | null
  finishedBy?: { id: string; username: string; name: string; role: string } | null
  cancelledBy?: { id: string; username: string; name: string; role: string } | null
}

// ─── Client ────────────────────────────────────────────────────────────────

export interface Client {
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

// ─── User ──────────────────────────────────────────────────────────────────

export interface UserItem {
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

// ─── Supplier Payment ──────────────────────────────────────────────────────

export interface SupplierPaymentItem {
  id: string
  concept: string
  amount: number
  userId: string
  user: { id: string; username: string; name: string }
  cashSessionId: string
  createdAt: string
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export interface DashboardData {
  stats: {
    totalOrdersToday: number
    revenueToday: number
    totalCash: number
    totalCard: number
    totalSuppliers: number
    netTotal: number
    occupiedTables: number
    totalActiveTables: number
    totalActiveProducts: number
    lowStockCount: number
  }
  cashSession: {
    id: string
    openedAt: string
    openingCash: number
    openedBy: { id: string; username: string; name: string; role: string } | null
  } | null
  cashSessionOpen: boolean
  topProducts: { productId: string; name: string; totalQuantity: number; totalRevenue: number }[]
  lowStockProducts: { id: string; name: string; stock: number; category: string }[]
  recentOrders: Order[]
  ordersByStatus: { status: string; count: number }[]
  categories: { category: string; count: number }[]
}

// ─── Settings ──────────────────────────────────────────────────────────────

export interface SettingsData {
  id: string
  restaurantId: string
  fiscalName: string
  taxId: string
  fiscalAddress: string
  phone: string
  email: string
  ticketLegalText: string
  defaultVatRate: number
  logoUrl: string
  defaultDocumentType: 'ticket' | 'factura'
}

// ─── Restaurant (Super Admin) ──────────────────────────────────────────────

export interface RestaurantItem {
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

// ─── Print Job ─────────────────────────────────────────────────────────────

export interface PrintJobItem {
  id: string
  html: string
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthContextType {
  authToken: string | null
  currentUser: { userId: string; username: string; role: string; name: string; restaurantId?: string; mustChangePassword?: boolean } | null
  authHeaders: (contentType?: boolean) => Record<string, string>
  handleFetchResponse: (res: Response) => boolean
  logout: () => void
}
