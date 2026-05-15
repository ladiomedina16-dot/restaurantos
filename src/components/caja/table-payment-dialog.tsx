'use client'

import {
  Euro, CreditCard, SplitSquareHorizontal, Printer, FileText, XCircle,
  CalculatorIcon, X, Beer, Star, UserCircle, Phone, Clock,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatEUR, formatTime } from '@/lib/formatters'
import { handlePrintTicket } from '@/lib/print-client'
import type { Order } from '@/types/restaurant'

interface TablePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Table info
  selectedTable: { id: string; number: number; zone: string } | undefined
  selectedOrders: Order[]
  allItems: Order['items']
  // Calculated values
  subtotal: number
  finalDiscount: number
  total: number
  hasClient: boolean
  freeDrinks: number
  bebidasTotal: number
  clientInfo: { id: string; name: string; phone: string; points?: number; visits?: number } | null
  pointsEarned: number
  // Payment
  selectedPaymentMethod: 'efectivo' | 'tarjeta' | 'mixto'
  onPaymentMethodChange: (method: 'efectivo' | 'tarjeta' | 'mixto') => void
  mixtoEfectivo: string
  mixtoTarjeta: string
  onMixtoEfectivoChange: (v: string) => void
  onMixtoTarjetaChange: (v: string) => void
  onCobrar: () => void
  paying: boolean
  cashSession: any
  authHeaders: (contentType?: boolean) => Record<string, string>
  onCancelOrder: (orderId: string) => void
  onShowCalculator: () => void
}

export function TablePaymentDialog({
  open,
  onOpenChange,
  selectedTable,
  selectedOrders,
  allItems,
  subtotal,
  finalDiscount,
  total,
  hasClient,
  freeDrinks,
  bebidasTotal,
  clientInfo,
  pointsEarned,
  selectedPaymentMethod,
  onPaymentMethodChange,
  mixtoEfectivo,
  mixtoTarjeta,
  onMixtoEfectivoChange,
  onMixtoTarjetaChange,
  onCobrar,
  paying,
  cashSession,
  authHeaders,
  onCancelOrder,
  onShowCalculator,
}: TablePaymentDialogProps) {
  if (!selectedTable) return null

  // Mixto validation
  const mixtoEfectivoNum = parseFloat(mixtoEfectivo) || 0
  const mixtoTarjetaNum = parseFloat(mixtoTarjeta) || 0
  const mixtoTotal = mixtoEfectivoNum + mixtoTarjetaNum
  const mixtoDiff = Math.round((mixtoTotal - total) * 100) / 100
  const canPay = selectedPaymentMethod !== 'mixto' || mixtoDiff === 0

  // IVA
  const ivaRate = 0.10
  const baseImponible = total / (1 + ivaRate)
  const ivaAmount = total - baseImponible

  const hasSelection = selectedOrders.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl bg-white border-gray-200 p-0 gap-0 max-h-[90vh] flex flex-col"
        showCloseButton={false}
      >
        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">
              Mesa {selectedTable.number} — Cobro
            </h2>
            <Badge className="bg-emerald-600 text-white text-[10px] border-0">
              {allItems.length} item{allItems.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* ─── Client Info ─────────────────────────────────────── */}
        {clientInfo && (
          <div className="mx-5 mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <UserCircle className="size-4 text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-amber-800">{clientInfo.name}</span>
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <Phone className="size-3" />{clientInfo.phone}
              </span>
              {clientInfo.points !== undefined && (
                <span className="text-xs text-amber-600 flex items-center gap-0.5 ml-auto">
                  <Star className="size-3" />{clientInfo.points} pts
                </span>
              )}
            </div>
          </div>
        )}

        {/* ─── Scrollable: Items + Totals ──────────────────────── */}
        <ScrollArea className="flex-1 min-h-0 px-5 py-3">
          {/* Items table header */}
          <div className="grid grid-cols-[1fr_48px_64px_64px] gap-1 text-gray-400 uppercase text-[10px] font-semibold tracking-wider pb-1 border-b border-gray-100">
            <span>Producto</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Total</span>
          </div>

          {/* Order groups */}
          {selectedOrders.map((order) => (
            <div key={order.id} className="mt-1">
              <div className="flex items-center justify-between py-1">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 ${
                    order.status === 'bill_requested'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : order.status === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : order.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-orange-50 text-orange-700 border-orange-300'
                  }`}
                >
                  {order.status === 'bill_requested' ? '🧾 Cuenta pedida' : order.status === 'ready' ? '✅ Listo' : order.status === 'pending' ? '⏳ Pendiente' : '🔥 En curso'}
                </Badge>
                <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                  <Clock className="size-2.5" />{formatTime(order.createdAt)}
                </span>
              </div>

              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_48px_64px_64px] gap-1 items-center py-1.5 px-1 rounded hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-800 truncate">{item.product?.name ?? 'Producto'}</span>
                  <span className="text-sm text-gray-500 text-center">{item.quantity}</span>
                  <span className="text-xs text-gray-400 text-right">{formatEUR(item.unitPrice)}</span>
                  <span className="text-sm font-semibold text-gray-800 text-right">{formatEUR(item.subtotal)}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Totals */}
          <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatEUR(subtotal)}</span>
            </div>

            {hasClient && freeDrinks > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span className="flex items-center gap-0.5">
                  <Beer className="size-3" />5ª GRATIS ({freeDrinks})
                </span>
                <span>-{formatEUR(finalDiscount)}</span>
              </div>
            )}
            {hasClient && bebidasTotal > 0 && freeDrinks === 0 && (
              <div className="text-xs text-gray-400 flex items-center gap-0.5">
                <Beer className="size-3" />{bebidasTotal}/5 bebidas para 5ª gratis
              </div>
            )}
            {!hasClient && bebidasTotal >= 5 && (
              <div className="text-xs text-amber-600 flex items-center gap-0.5">
                <Beer className="size-3" />Asigna cliente para 5ª gratis
              </div>
            )}

            <div className="flex justify-between text-xs text-gray-500">
              <span>IVA 10%</span>
              <span>{formatEUR(ivaAmount)}</span>
            </div>

            <Separator className="bg-gray-200 my-1" />

            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-gray-800">TOTAL</span>
              <span className="text-2xl font-black text-emerald-600 tracking-tight">
                {formatEUR(total)}
              </span>
            </div>

            {pointsEarned > 0 && (
              <div className="text-xs text-gray-400 flex items-center gap-0.5">
                <Star className="size-3 text-amber-500" />
                Puntos: <span className="font-bold text-amber-600">{pointsEarned}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ─── Payment Section (always visible at bottom) ──────── */}
        <div className="border-t border-gray-200 px-5 py-3 shrink-0 space-y-3">
          {/* Payment method buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              className={`h-11 text-sm font-bold rounded-lg transition-all active:scale-95 ${
                selectedPaymentMethod === 'efectivo'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
              }`}
              onClick={() => onPaymentMethodChange('efectivo')}
            >
              <Euro className="size-4 mr-1.5" />
              EFECTIVO
            </Button>
            <Button
              className={`h-11 text-sm font-bold rounded-lg transition-all active:scale-95 ${
                selectedPaymentMethod === 'tarjeta'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
              }`}
              onClick={() => onPaymentMethodChange('tarjeta')}
            >
              <CreditCard className="size-4 mr-1.5" />
              TARJETA
            </Button>
            <Button
              className={`h-11 text-sm font-bold rounded-lg transition-all active:scale-95 ${
                selectedPaymentMethod === 'mixto'
                  ? 'bg-gray-500 hover:bg-gray-600 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
              }`}
              onClick={() => onPaymentMethodChange('mixto')}
            >
              <SplitSquareHorizontal className="size-4 mr-1.5" />
              MIXTO
            </Button>
          </div>

          {/* Mixto split inputs */}
          {selectedPaymentMethod === 'mixto' && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-emerald-600 font-semibold">Efectivo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={mixtoEfectivo}
                    onChange={(e) => onMixtoEfectivoChange(e.target.value)}
                    className="h-9 text-sm bg-white border-gray-200 text-gray-800"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-blue-600 font-semibold">Tarjeta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={mixtoTarjeta}
                    onChange={(e) => onMixtoTarjetaChange(e.target.value)}
                    className="h-9 text-sm bg-white border-gray-200 text-gray-800"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total desglose:</span>
                <span className={`font-bold ${mixtoDiff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatEUR(mixtoTotal)}
                  {mixtoDiff !== 0 && (
                    <span className="ml-1">({mixtoDiff > 0 ? '+' : ''}{formatEUR(mixtoDiff)})</span>
                  )}
                </span>
              </div>
              {!canPay && (
                <p className="text-[10px] text-red-600 text-center font-medium">
                  Desglose debe sumar el total
                </p>
              )}
            </div>
          )}

          {/* COBRAR button */}
          <Button
            className={`w-full h-12 text-base font-black rounded-lg transition-all active:scale-[0.98] ${
              !cashSession
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            onClick={onCobrar}
            disabled={paying || selectedOrders.length === 0 || !cashSession || !canPay}
          >
            <Euro className="size-5 mr-1.5" />
            {paying ? 'Cobrando...' : 'COBRAR'}
          </Button>
          {!cashSession && (
            <p className="text-[10px] text-red-600 text-center font-medium">Abre caja para cobrar</p>
          )}

          {/* Action buttons row */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              className="h-9 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
              onClick={onShowCalculator}
            >
              <CalculatorIcon className="size-3.5 mr-1" />
              Calc
            </Button>
            <Button
              className="h-9 text-xs font-semibold rounded-lg bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
              onClick={() => {
                if (hasSelection) handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'ticket')
              }}
              disabled={!hasSelection}
            >
              <Printer className="size-3.5 mr-1" />
              Ticket
            </Button>
            <Button
              className="h-9 text-xs font-semibold rounded-lg bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
              onClick={() => {
                if (hasSelection) handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'factura')
              }}
              disabled={!hasSelection}
            >
              <FileText className="size-3.5 mr-1" />
              Factura
            </Button>
            <Button
              className="h-9 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
              onClick={() => {
                if (hasSelection) onCancelOrder(selectedOrders[0].id)
              }}
              disabled={!hasSelection}
            >
              <XCircle className="size-3.5 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
