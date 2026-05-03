import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Tipos de eventos del restaurante
interface OrderEvent {
  type: 'created' | 'updated' | 'status_changed' | 'deleted'
  order: any
  timestamp: string
}

interface TableEvent {
  type: 'status_changed' | 'updated'
  table: any
  timestamp: string
}

interface ProductEvent {
  type: 'stock_updated' | 'updated' | 'created' | 'deleted'
  product: any
  timestamp: string
}

// Sala de cocina: solo eventos de pedidos para cocina
// Sala de barra: eventos de pedidos y mesas
// Sala de admin: todos los eventos

io.on('connection', (socket) => {
  console.log(`[Restaurant RT] Connected: ${socket.id}`)

  // ─── UNIRSE A SALAS ──────────────────────────────
  socket.on('join-room', (room: string) => {
    socket.join(room)
    console.log(`[Restaurant RT] ${socket.id} joined room: ${room}`)
    socket.emit('room-joined', { room, timestamp: new Date().toISOString() })
  })

  // ─── PEDIDOS EN TIEMPO REAL ──────────────────────
  // Cuando un camarero guarda un pedido → cocina lo ve al instante
  socket.on('order-created', (data: OrderEvent) => {
    console.log(`[Restaurant RT] Order created: ${data.order?.id}`)
    // Notificar a cocina y admin
    io.to('kitchen').emit('order-created', data)
    io.to('admin').emit('order-created', data)
    // Notificar a la sala de barra también
    io.to('bar').emit('order-created', data)
  })

  socket.on('order-updated', (data: OrderEvent) => {
    console.log(`[Restaurant RT] Order updated: ${data.order?.id}`)
    io.to('kitchen').emit('order-updated', data)
    io.to('admin').emit('order-updated', data)
    io.to('bar').emit('order-updated', data)
  })

  socket.on('order-status-changed', (data: OrderEvent) => {
    console.log(`[Restaurant RT] Order status changed: ${data.order?.id} → ${data.order?.status}`)
    // Cocina ve cambios de estado (ej: "listo para servir")
    io.to('kitchen').emit('order-status-changed', data)
    io.to('admin').emit('order-status-changed', data)
    io.to('bar').emit('order-status-changed', data)
    // Camareros en sala también
    io.to('floor').emit('order-status-changed', data)
  })

  // ─── MESAS EN TIEMPO REAL ────────────────────────
  socket.on('table-status-changed', (data: TableEvent) => {
    console.log(`[Restaurant RT] Table ${data.table?.number} → ${data.table?.status}`)
    io.to('admin').emit('table-status-changed', data)
    io.to('floor').emit('table-status-changed', data)
    io.to('bar').emit('table-status-changed', data)
  })

  // ─── STOCK DE PRODUCTOS ──────────────────────────
  socket.on('product-stock-updated', (data: ProductEvent) => {
    console.log(`[Restaurant RT] Product ${data.product?.name} stock: ${data.product?.stock}`)
    io.to('kitchen').emit('product-stock-updated', data)
    io.to('admin').emit('product-stock-updated', data)
    io.to('bar').emit('product-stock-updated', data)
  })

  // ─── DESCONEXIÓN ─────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Restaurant RT] Disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`[Restaurant RT] Error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[Restaurant RT] Realtime server running on port ${PORT}`)
  console.log(`[Restaurant RT] Rooms: kitchen, bar, floor, admin`)
})

process.on('SIGTERM', () => {
  console.log('[Restaurant RT] SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[Restaurant RT] SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
