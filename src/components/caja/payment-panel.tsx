'use client'

import { Printer, FileText, History, XCircle, CalculatorIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { handlePrintTicket } from '@/lib/print-client'
import type { Order } from '@/types/restaurant'

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'mixto'

interface PaymentPanelProps {
  onCancelOrder: (orderId: string) => void
  selectedOrders: Order[]
  authHeaders: (contentType?: boolean) => Record<string, string>
  onShowHistory: () => void
  onShowCalculator: () => void
}

export function PaymentPanel({
  onCancelOrder,
  selectedOrders,
  authHeaders,
  onShowHistory,
  onShowCalculator,
}: PaymentPanelProps) {
  const hasSelection = selectedOrders.length > 0

  return (
    <div className="flex items-center gap-2 w-full">
      {/* CALC — amber accent */}
      <Button
        className="h-10 text-xs font-semibold rounded-lg flex-1 flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
        onClick={onShowCalculator}
      >
        <CalculatorIcon className="size-3.5" />
        CALC
      </Button>

      {/* IMPRIMIR TICKET */}
      <Button
        className="h-10 text-xs font-semibold rounded-lg flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
        onClick={() => {
          if (hasSelection) handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'ticket')
        }}
        disabled={!hasSelection}
      >
        <Printer className="size-3.5" />
        IMPRIMIR TICKET
      </Button>

      {/* IMPRIMIR FACTURA */}
      <Button
        className="h-10 text-xs font-semibold rounded-lg flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
        onClick={() => {
          if (hasSelection) handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'factura')
        }}
        disabled={!hasSelection}
      >
        <FileText className="size-3.5" />
        IMPRIMIR FACTURA
      </Button>

      {/* VER HISTORIAL */}
      <Button
        className="h-10 text-xs font-semibold rounded-lg flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
        onClick={onShowHistory}
      >
        <History className="size-3.5" />
        VER HISTORIAL
      </Button>

      {/* CANCELAR PEDIDO — red */}
      <Button
        className="h-10 text-xs font-semibold rounded-lg flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
        onClick={() => {
          if (hasSelection) onCancelOrder(selectedOrders[0].id)
        }}
        disabled={!hasSelection}
      >
        <XCircle className="size-3.5" />
        CANCELAR PEDIDO
      </Button>
    </div>
  )
}
