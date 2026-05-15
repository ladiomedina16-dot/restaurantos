'use client'

import { Euro, CreditCard, SplitSquareHorizontal, Printer, FileText, History, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatEUR } from '@/lib/formatters'
import { handlePrintTicket } from '@/lib/print-client'
import type { Order } from '@/types/restaurant'

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'mixto'

interface PaymentPanelProps {
  selectedPaymentMethod: PaymentMethod
  onPaymentMethodChange: (method: PaymentMethod) => void
  onCobrar: () => void
  paying: boolean
  total: number
  cashSession: any
  selectedOrders: Order[]
  authHeaders: (contentType?: boolean) => Record<string, string>
  /** Mixto split amounts */
  mixtoEfectivo: string
  mixtoTarjeta: string
  onMixtoEfectivoChange: (v: string) => void
  onMixtoTarjetaChange: (v: string) => void
  onCancelOrder: (orderId: string) => void
  onShowHistory: () => void
}

export function PaymentPanel({
  selectedPaymentMethod,
  onPaymentMethodChange,
  onCobrar,
  paying,
  total,
  cashSession,
  selectedOrders,
  authHeaders,
  mixtoEfectivo,
  mixtoTarjeta,
  onMixtoEfectivoChange,
  onMixtoTarjetaChange,
  onCancelOrder,
  onShowHistory,
}: PaymentPanelProps) {
  const mixtoEfectivoNum = parseFloat(mixtoEfectivo) || 0
  const mixtoTarjetaNum = parseFloat(mixtoTarjeta) || 0
  const mixtoTotal = mixtoEfectivoNum + mixtoTarjetaNum
  const mixtoDiff = Math.round((mixtoTotal - total) * 100) / 100

  const canPay = selectedPaymentMethod !== 'mixto' || mixtoDiff === 0

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
      {/* Payment Method Buttons */}
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            className={`h-14 text-sm font-bold rounded-xl transition-all active:scale-95 ${
              selectedPaymentMethod === 'efectivo'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-600/30'
            }`}
            onClick={() => onPaymentMethodChange('efectivo')}
          >
            <Euro className="size-5 mr-2" />
            Efectivo
          </Button>
          <Button
            className={`h-14 text-sm font-bold rounded-xl transition-all active:scale-95 ${
              selectedPaymentMethod === 'tarjeta'
                ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-600/30'
            }`}
            onClick={() => onPaymentMethodChange('tarjeta')}
          >
            <CreditCard className="size-5 mr-2" />
            Tarjeta
          </Button>
          <Button
            className={`h-14 text-sm font-bold rounded-xl transition-all active:scale-95 ${
              selectedPaymentMethod === 'mixto'
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-600/30'
            }`}
            onClick={() => onPaymentMethodChange('mixto')}
          >
            <SplitSquareHorizontal className="size-5 mr-2" />
            Mixto
          </Button>
        </div>

        {/* Mixto Split Inputs */}
        {selectedPaymentMethod === 'mixto' && (
          <div className="bg-slate-800/40 rounded-lg p-3 space-y-2 border border-slate-700/30">
            <p className="text-xs text-slate-400 font-medium mb-1">Desglose del pago mixto</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-emerald-400">Efectivo (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mixtoEfectivo}
                  onChange={(e) => onMixtoEfectivoChange(e.target.value)}
                  className="h-10 bg-slate-900/50 border-slate-600/30 text-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-sky-400">Tarjeta (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mixtoTarjeta}
                  onChange={(e) => onMixtoTarjetaChange(e.target.value)}
                  className="h-10 bg-slate-900/50 border-slate-600/30 text-white text-sm"
                />
              </div>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-slate-400">Total desglose:</span>
              <span className={`font-bold ${mixtoDiff === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatEUR(mixtoTotal)}
                {mixtoDiff !== 0 && (
                  <span className="ml-1">({mixtoDiff > 0 ? '+' : ''}{formatEUR(mixtoDiff)})</span>
                )}
              </span>
            </div>
            {!canPay && (
              <p className="text-[10px] text-red-400 text-center">El desglose debe sumar exactamente el total</p>
            )}
          </div>
        )}

        {/* COBRAR Button */}
        <Button
          className={`w-full h-16 text-xl font-black rounded-xl transition-all active:scale-[0.98] ${
            !cashSession
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
          }`}
          onClick={onCobrar}
          disabled={paying || selectedOrders.length === 0 || !cashSession || !canPay}
        >
          <Euro className="size-6 mr-2" />
          {paying ? 'Cobrando...' : 'COBRAR'}
        </Button>

        {!cashSession && (
          <p className="text-xs text-red-400 text-center font-medium">
            Abre caja para poder cobrar
          </p>
        )}
      </div>

      <Separator className="bg-slate-700/40" />

      {/* Action Buttons */}
      <div className="p-3 grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          className="h-11 text-xs font-medium rounded-lg bg-slate-800/40 hover:bg-slate-700/40 text-slate-300 border border-slate-700/30"
          onClick={() => {
            if (selectedOrders.length > 0) {
              handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'ticket')
            }
          }}
          disabled={selectedOrders.length === 0}
        >
          <Printer className="size-4 mr-1.5" />
          Ticket
        </Button>
        <Button
          variant="ghost"
          className="h-11 text-xs font-medium rounded-lg bg-slate-800/40 hover:bg-slate-700/40 text-slate-300 border border-slate-700/30"
          onClick={() => {
            if (selectedOrders.length > 0) {
              handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'factura')
            }
          }}
          disabled={selectedOrders.length === 0}
        >
          <FileText className="size-4 mr-1.5" />
          Factura
        </Button>
        <Button
          variant="ghost"
          className="h-11 text-xs font-medium rounded-lg bg-slate-800/40 hover:bg-slate-700/40 text-slate-300 border border-slate-700/30"
          onClick={onShowHistory}
        >
          <History className="size-4 mr-1.5" />
          Historial
        </Button>
        <Button
          variant="ghost"
          className="h-11 text-xs font-medium rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700/30"
          onClick={() => {
            if (selectedOrders.length > 0) {
              onCancelOrder(selectedOrders[0].id)
            }
          }}
          disabled={selectedOrders.length === 0}
        >
          <XCircle className="size-4 mr-1.5" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}
