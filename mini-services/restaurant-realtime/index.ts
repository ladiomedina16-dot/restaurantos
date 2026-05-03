import { createServer } from 'http'
import { Server } from 'socket.io'

// ============================================================
// RestaurantOS Real-time Server v2
// SERVER-ONLY emissions: API routes emit via HTTP POST
// Clients can only LISTEN, never emit broadcast events
// ============================================================

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

// ─── Shared secret for API → Socket auth ────────────────────
const API_SECRET = process.env.API_SECRET || 'restaurantos-api-secret'

// ─── Socket.io connections (clients) ────────────────────────

io.on('connection', (socket: any) => {
  console.log(`[RT] Connected: ${socket.id}`)

  // Clients can only join rooms (for receiving targeted events)
  socket.on('join-room', (room: string) => {
    // Only allow joining valid rooms
    const validRooms = ['kitchen', 'bar', 'floor', 'admin', 'caja']
    if (validRooms.includes(room)) {
      socket.join(room)
      console.log(`[RT] ${socket.id} joined room: ${room}`)
      socket.emit('room-joined', { room, timestamp: new Date().toISOString() })
    }
  })

  // ─── CLIENT EMITS ARE IGNORED FOR BROADCAST EVENTS ────
  // order-created, order-ready, table-cleared etc. are ONLY emitted
  // by the server after API validation via the HTTP endpoint below.
  // We still handle join-room for subscription purposes.

  socket.on('disconnect', () => {
    console.log(`[RT] Disconnected: ${socket.id}`)
  })

  socket.on('error', (error: any) => {
    console.error(`[RT] Error (${socket.id}):`, error)
  })
})

// ─── HTTP Endpoint for Server-Side Emission ─────────────────
// POST /emit — called by Next.js API routes after DB operations
// Requires API secret header for security

const emitHandler = (req: any, res: any) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body = ''
  req.on('data', (chunk: any) => { body += chunk })
  req.on('end', () => {
    try {
      const data = JSON.parse(body)
      const { event, payload, rooms, secret } = data

      // Verify API secret
      if (secret !== API_SECRET) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Forbidden' }))
        return
      }

      if (!event || !payload) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing event or payload' }))
        return
      }

      // Emit to specified rooms or all
      const targetRooms = rooms || ['kitchen', 'bar', 'floor', 'admin', 'caja']

      console.log(`[RT] 🔔 Server emit: ${event} → rooms: ${targetRooms.join(',')}`)

      for (const room of targetRooms) {
        io.to(room).emit(event, payload)
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, event, rooms: targetRooms }))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
    }
  })
}

// Route: POST /emit
httpServer.on('request', (req: any, res: any) => {
  if (req.url === '/emit') {
    return emitHandler(req, res)
  }
  // Let Socket.io handle everything else
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[RT] Realtime server v2 running on port ${PORT}`)
  console.log(`[RT] Server-only emissions via POST /emit`)
  console.log(`[RT] Rooms: kitchen, bar, floor, admin, caja`)
})

process.on('SIGTERM', () => {
  console.log('[RT] SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[RT] SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
