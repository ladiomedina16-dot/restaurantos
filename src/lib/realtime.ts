// ============================================================
// Server-side real-time emission helper
// Vercel-compatible: No Socket.io server needed.
// Real-time is handled by client-side HTTP polling.
// This module is kept as a no-op for API route compatibility
// (API routes still call emitOrderCreated etc., but they
// simply do nothing — clients poll for updates instead).
// ============================================================

/**
 * No-op: Previously emitted to Socket.io server.
 * Now clients use HTTP polling for updates.
 */
async function emitRealtimeEventNoOp(_opts: { event: string; payload: unknown; rooms?: string[] }): Promise<void> {
  // No-op: polling replaces real-time push
}

// ─── Pre-built event emitters (no-op, kept for API compatibility) ──

export async function emitOrderCreated(_order: unknown) {
  return emitRealtimeEventNoOp({ event: 'order-created', payload: _order, rooms: ['kitchen', 'admin', 'bar', 'caja'] })
}

export async function emitOrderStatusChanged(_order: unknown) {
  return emitRealtimeEventNoOp({ event: 'order-status-changed', payload: _order, rooms: ['kitchen', 'admin', 'bar', 'floor', 'caja'] })
}

export async function emitOrderReady(_order: unknown) {
  return emitRealtimeEventNoOp({ event: 'order-ready', payload: _order, rooms: ['floor', 'admin', 'bar', 'caja', 'kitchen'] })
}

export async function emitTableCleared(_tableId: string, _tableNumber: number) {
  return emitRealtimeEventNoOp({ event: 'table-cleared', payload: { tableId: _tableId, tableNumber: _tableNumber }, rooms: ['admin', 'floor', 'bar', 'caja', 'kitchen'] })
}

export async function emitTableStatusChanged(_table: unknown) {
  return emitRealtimeEventNoOp({ event: 'table-status-changed', payload: _table, rooms: ['admin', 'floor', 'bar', 'caja'] })
}
