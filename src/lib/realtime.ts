// ============================================================
// Server-side real-time emission helper
// API routes call this after successful DB operations
// This sends events to the Socket.io server which broadcasts
// to connected clients. Frontend NEVER emits broadcast events.
// ============================================================

const SOCKET_SERVER_URL = 'http://localhost:3003'
const API_SECRET = process.env.API_SECRET || 'restaurantos-api-secret'

interface EmitOptions {
  event: string
  payload: unknown
  rooms?: string[]
}

/**
 * Emit a real-time event from the server (API route) to the Socket.io server.
 * This is the ONLY way broadcast events should be triggered.
 * Frontend clients can only LISTEN, never emit.
 */
export async function emitRealtimeEvent({ event, payload, rooms }: EmitOptions): Promise<void> {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        payload,
        rooms,
        secret: API_SECRET,
      }),
    })

    if (!res.ok) {
      console.error(`[RT Emit] Failed to emit ${event}: ${res.status}`)
    }
  } catch (error) {
    console.error(`[RT Emit] Error emitting ${event}:`, error)
  }
}

// ─── Pre-built event emitters ───────────────────────────────

export async function emitOrderCreated(order: unknown) {
  return emitRealtimeEvent({
    event: 'order-created',
    payload: {
      type: 'created',
      order,
      timestamp: new Date().toISOString(),
    },
    rooms: ['kitchen', 'admin', 'bar', 'caja'],
  })
}

export async function emitOrderStatusChanged(order: unknown) {
  return emitRealtimeEvent({
    event: 'order-status-changed',
    payload: {
      type: 'status_changed',
      order,
      timestamp: new Date().toISOString(),
    },
    rooms: ['kitchen', 'admin', 'bar', 'floor', 'caja'],
  })
}

export async function emitOrderReady(order: unknown) {
  return emitRealtimeEvent({
    event: 'order-ready',
    payload: {
      type: 'ready',
      order,
      timestamp: new Date().toISOString(),
    },
    rooms: ['floor', 'admin', 'bar', 'caja', 'kitchen'],
  })
}

export async function emitTableCleared(tableId: string, tableNumber: number) {
  return emitRealtimeEvent({
    event: 'table-cleared',
    payload: {
      tableId,
      tableNumber,
      timestamp: new Date().toISOString(),
    },
    rooms: ['admin', 'floor', 'bar', 'caja', 'kitchen'],
  })
}

export async function emitTableStatusChanged(table: unknown) {
  return emitRealtimeEvent({
    event: 'table-status-changed',
    payload: {
      type: 'status_changed',
      table,
      timestamp: new Date().toISOString(),
    },
    rooms: ['admin', 'floor', 'bar', 'caja'],
  })
}
