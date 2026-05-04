import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server } from 'socket.io'

// ============================================================
// RestaurantOS Real-time Server v3
// SERVER-ONLY emissions: API routes emit via HTTP POST
// Clients can only LISTEN, never emit broadcast events
// ============================================================

// ─── Shared secret for API → Socket auth ────────────────────
const API_SECRET = process.env.API_SECRET || 'rst-os-api-s3cr3t-2024'

// ─── HTTP Handlers (must be registered BEFORE Socket.io) ────

const emitHandler = (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body = ''
  req.on('data', (chunk: Buffer) => { body += chunk.toString() })
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

      console.log(`[RT] Server emit: ${event} -> rooms: ${targetRooms.join(',')}`)

      for (const room of targetRooms) {
        io.to(room).emit(event, payload)
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, event, rooms: targetRooms }))
    } catch (err) {
      console.error('[RT] Parse error:', err)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
    }
  })
}

const healthHandler = (_req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok', connections: io.sockets.sockets.size }))
}

// ─── Create HTTP server with route handling ─────────────────

const httpServer = createServer((req, res) => {
  // Handle API routes BEFORE Socket.io processes them
  if (req.url === '/emit') {
    return emitHandler(req, res)
  }
  if (req.url === '/health') {
    return healthHandler(req, res)
  }
  // Let other requests fall through to Socket.io
})

// ─── Attach Socket.io to the HTTP server ────────────────────

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  serveClient: false,
})

// ─── Socket.io connections (clients) ────────────────────────

io.on('connection', (socket: any) => {
  console.log(`[RT] Connected: ${socket.id}`)

  // Clients can only join rooms (for receiving targeted events)
  socket.on('join-room', (room: string) => {
    const validRooms = ['kitchen', 'bar', 'floor', 'admin', 'caja']
    if (validRooms.includes(room)) {
      socket.join(room)
      console.log(`[RT] ${socket.id} joined room: ${room}`)
      socket.emit('room-joined', { room, timestamp: new Date().toISOString() })
    }
  })

  // Leave room
  socket.on('leave-room', (room: string) => {
    const validRooms = ['kitchen', 'bar', 'floor', 'admin', 'caja']
    if (validRooms.includes(room)) {
      socket.leave(room)
      console.log(`[RT] ${socket.id} left room: ${room}`)
    }
  })

  socket.on('disconnect', (reason: string) => {
    console.log(`[RT] Disconnected: ${socket.id} (${reason})`)
  })

  socket.on('error', (error: any) => {
    console.error(`[RT] Error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[RT] Realtime server v3 running on port ${PORT}`)
  console.log(`[RT] Server-only emissions via POST /emit`)
  console.log(`[RT] Health check: GET /health`)
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
