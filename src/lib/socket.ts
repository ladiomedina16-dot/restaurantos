// ============================================================
// Real-time client — Vercel-compatible polling fallback
// Socket.io removed: Vercel serverless doesn't support
// persistent WebSocket servers. Uses HTTP polling instead.
// ============================================================

type EventHandler = (data: unknown) => void

const listeners: Map<string, Set<EventHandler>> = new Map()

// Simulate socket event emission locally (used by polling callbacks)
export function emitLocal(event: string, data: unknown) {
  const handlers = listeners.get(event)
  if (handlers) {
    handlers.forEach((handler) => {
      try { handler(data) } catch (e) { console.error('[RT] Event handler error:', e) }
    })
  }
}

// Polling-based "socket" that mimics the Socket.io interface
// This is a drop-in replacement — components use .on()/.off() as before
class PollingSocket {
  private connected = false

  on(event: string, handler: EventHandler) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler) {
    listeners.get(event)?.delete(handler)
  }

  emit(_event: string, _data?: unknown) {
    // No-op: clients never emit broadcast events
  }

  joinRoom(_room: string) {
    // No-op for polling
  }

  get id() {
    return 'polling-client'
  }
}

let socketInstance: PollingSocket | null = null

export const getSocket = (): PollingSocket => {
  if (!socketInstance) {
    socketInstance = new PollingSocket()
  }
  return socketInstance
}

export const disconnectSocket = () => {
  // Clean up all listeners
  listeners.clear()
  socketInstance = null
}
