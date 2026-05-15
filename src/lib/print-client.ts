// ─── RestaurantOS — Client-side Print Helpers ──────────────────────────────
// Handles both manual on-demand printing (handlePrintTicket)
// and automatic PrintJob queue printing (printJob).
// Extracted from src/app/page.tsx during Phase 1 refactor.

import { toast } from 'sonner'
import type { PrintJobItem } from '@/types/restaurant'

// ─── Dedup Guard ───────────────────────────────────────────────────────────
// Prevents the same print job from being processed twice concurrently.
const _printingJobIds = new Set<string>()

// ─── Manual on-demand print ────────────────────────────────────────────────
// NOTE: Printer selection depends on the browser/OS.
// For silent printing, QZ Tray, a local app, or Capacitor is required.

export const handlePrintTicket = async (
  type: 'kitchen' | 'bar' | 'receipt',
  orderId: string,
  authHeaders: (contentType?: boolean) => Record<string, string>,
  documentType?: 'ticket' | 'factura',
) => {
  try {
    const body: Record<string, string> = { type, orderId }
    if (documentType) body.documentType = documentType

    const res = await fetch('/api/print', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const { html } = await res.json()
      const printWindow = window.open('', '_blank', 'width=320,height=600')
      if (!printWindow) {
        toast.error('Ventana emergente bloqueada. Permite popups para este sitio.')
        return
      }
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      toast.success('Ticket enviado a impresión')
    } else {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
      toast.error(err.error || 'Error al imprimir ticket')
    }
  } catch {
    toast.error('Error de red al imprimir ticket')
  }
}

// ─── Auto-print from queue ─────────────────────────────────────────────────
// Processes a single PrintJob: opens print window, prints, marks as printed/failed.

export const printJob = async (
  job: PrintJobItem,
  authHeaders: (contentType?: boolean) => Record<string, string>,
  destination: 'kitchen' | 'bar',
) => {
  // Dedup guard: skip if already being processed
  if (_printingJobIds.has(job.id)) return
  _printingJobIds.add(job.id)

  try {
    const printWindow = window.open('', '_blank', 'width=320,height=600')
    if (printWindow) {
      printWindow.document.write(job.html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      // Mark as printed
      await fetch(`/api/print/jobs/${job.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'printed' }),
      })
    } else {
      // Popup blocked — mark as failed
      await fetch(`/api/print/jobs/${job.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'failed', error: 'Popup bloqueada' }),
      })
      const label = destination === 'kitchen' ? 'cocina' : 'barra'
      toast.error(`Popup bloqueada al imprimir comanda ${label}. Permite popups para este sitio.`)
    }
  } catch {
    // Mark as failed on any error
    try {
      await fetch(`/api/print/jobs/${job.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'failed', error: 'Error de impresión' }),
      })
    } catch { /* give up */ }
  } finally {
    // Always clean up the dedup set
    _printingJobIds.delete(job.id)
  }
}
