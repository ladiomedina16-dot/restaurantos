'use client'

import { ArrowLeft, Receipt, Clock, XCircle, UserCircle, Phone, Star, Beer, Euro, CreditCard, SplitSquareHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatEUR, formatTime } from '@/lib/formatters'
import type { Order } from '@/types/restaurant'

interface OrderDetailPanelProps {
  // Existing props
  selectedTable: { id: string; number: number; zone: string } | undefined
  selectedOrders: Order[]
  allItems: Order['items']
  subtotal: number
  finalDiscount: number
  total: number
  hasClient: boolean
  freeDrinks: number
  bebidasTotal: number
  clientInfo: { id: string; name: string; phone: string; points?: number; visits?: number } | null
  pointsEarned: number
  onBack: () => void
  onCancelOrder: (orderId: string) => void
  // Payment method props
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
}

export function OrderDetailPanel({
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
  onBack,
  onCancelOrder,
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
}: OrderDetailPanelProps) {
  const mixtoEfectivoNum = parseFloat(mixtoEfectivo) || 0
  const mixtoTarjetaNum = parseFloat(mixtoTarjeta) || 0
  const mixtoTotal = mixtoEfectivoNum + mixtoTarjetaNum
  const mixtoDiff = Math.round((mixtoTotal - total) * 100) / 100
  const canPay = selectedPaymentMethod !== 'mixto' || mixtoDiff === 0

  // IVA calculation
  const ivaRate = 0.10
  const baseImponible = total / (1 + ivaRate)
  const ivaAmount = total - baseImponible

  // Count total guests (comensales) from orders
  const totalComensales = allItems.reduce((s, i) => s + i.quantity, 0)

  // Gather order notes
  const orderNotes = selectedOrders
    .map((o) => o.notes)
    .filter((n) => n && n.trim() !== '')

  if (!selectedTable) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200">
        <Receipt className="size-12 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm font-medium">Selecciona una mesa</p>
        <p className="text-gray-400 text-xs mt-1">Elige una mesa ocupada para ver su cuenta</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border border-gray-200 overflow-hidden">
      {/* ─── Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="text-sm font-bold text-gray-800 tracking-wide">
          DETALLE DE MESA — MESA {selectedTable.number}
        </h3>
        <Badge className="bg-emerald-600 text-white text-[10px] hover:bg-emerald-600 border-0 ml-auto px-2 py-0">
          {allItems.length} item{allItems.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* ─── Client Info Bar ──────────────────────────────────── */}
      {clientInfo && (
        <div className="mx-4 mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <UserCircle className="size-4 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-800">{clientInfo.name}</span>
            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
              <Phone className="size-2.5" />{clientInfo.phone}
            </span>
            {clientInfo.points !== undefined && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5 ml-auto">
                <Star className="size-2.5" />{clientInfo.points} pts
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── Product Table (scrollable) ───────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-2">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_48px_64px_64px_28px] gap-1 text-gray-400 uppercase text-[10px] font-semibold tracking-wider pb-1 border-b border-gray-100">
            <span>Producto</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Total</span>
            <span></span>
          </div>

          {/* Order groups with status */}
          {selectedOrders.map((order) => (
            <div key={order.id} className="mt-1">
              {/* Order status badge + time */}
              <div className="flex items-center justify-between py-1">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 ${
                    order.status === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : order.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-orange-50 text-orange-700 border-orange-300'
                  }`}
                >
                  {order.status === 'ready' ? '✅ Listo' : order.status === 'pending' ? '⏳ Pendiente' : '🔥 En curso'}
                </Badge>
                <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                  <Clock className="size-2.5" />{formatTime(order.createdAt)}
                </span>
              </div>

              {/* Item rows */}
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_48px_64px_64px_28px] gap-1 items-center py-1.5 px-1 rounded hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs text-gray-800 truncate">{item.product?.name ?? 'Producto'}</span>
                  <span className="text-xs text-gray-500 text-center">{item.quantity}</span>
                  <span className="text-[10px] text-gray-400 text-right">{formatEUR(item.unitPrice)}</span>
                  <span className="text-xs font-semibold text-gray-800 text-right">{formatEUR(item.subtotal)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                    onClick={() => onCancelOrder(order.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          ))}

          {/* Notes Section */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Notas del pedido:</p>
            {orderNotes.length > 0 ? (
              orderNotes.map((note, i) => (
                <p key={i} className="text-xs text-gray-600 italic">"{note}"</p>
              ))
            ) : (
              <p className="text-xs text-gray-300 italic">Sin notas</p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* ─── Totals (always visible at bottom) ────────────────── */}
      <div className="shrink-0 border-t border-gray-200 px-4 py-2 space-y-0.5">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Subtotal</span>
          <span>{formatEUR(subtotal)}</span>
        </div>

        {hasClient && freeDrinks > 0 && (
          <div className="flex justify-between text-xs text-emerald-600">
            <span className="flex items-center gap-0.5">
              <Beer className="size-2.5" />5ª GRATIS ({freeDrinks})
            </span>
            <span>-{formatEUR(finalDiscount)}</span>
          </div>
        )}
        {hasClient && bebidasTotal > 0 && freeDrinks === 0 && (
          <div className="text-[9px] text-gray-400 flex items-center gap-0.5">
            <Beer className="size-2.5" />{bebidasTotal}/5 bebidas para 5ª gratis
          </div>
        )}
        {!hasClient && bebidasTotal >= 5 && (
          <div className="text-[9px] text-amber-600 flex items-center gap-0.5">
            <Beer className="size-2.5" />Asigna cliente para 5ª gratis
          </div>
        )}

        <div className="flex justify-between text-[10px] text-gray-500">
          <span>IVA 10%</span>
          <span>{formatEUR(ivaAmount)}</span>
        </div>

        <Separator className="bg-gray-200 my-1" />

        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-800">TOTAL</span>
          <span className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatEUR(total)}
          </span>
        </div>

        {pointsEarned > 0 && (
          <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Star className="size-2.5 text-amber-500" />
            Puntos: <span className="font-bold text-amber-600">{pointsEarned}</span>
          </div>
        )}
      </div>

      {/* ─── Payment Method Buttons ───────────────────────────── */}
      <div className="shrink-0 px-4 pb-2">
        <div className="grid grid-cols-3 gap-2">
          <Button
            className={`h-10 text-xs font-bold rounded-lg transition-all active:scale-95 ${
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
            className={`h-10 text-xs font-bold rounded-lg transition-all active:scale-95 ${
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
            className={`h-10 text-xs font-bold rounded-lg transition-all active:scale-95 ${
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

        {/* Mixto Split Inputs */}
        {selectedPaymentMethod === 'mixto' && (
          <div className="mt-2 bg-gray-50 rounded-lg p-2.5 space-y-1.5 border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-emerald-600 font-semibold">Efectivo</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mixtoEfectivo}
                  onChange={(e) => onMixtoEfectivoChange(e.target.value)}
                  className="h-8 text-xs bg-white border-gray-200 text-gray-800"
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
                  className="h-8 text-xs bg-white border-gray-200 text-gray-800"
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Total desglose:</span>
              <span className={`font-bold ${mixtoDiff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatEUR(mixtoTotal)}
                {mixtoDiff !== 0 && <span className="ml-1">({mixtoDiff > 0 ? '+' : ''}{formatEUR(mixtoDiff)})</span>}
              </span>
            </div>
            {!canPay && <p className="text-[9px] text-red-600 text-center font-medium">Desglose debe sumar el total</p>}
          </div>
        )}
      </div>

      {/* ─── COBRAR Button ────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-3">
        <Button
          className={`w-full h-12 text-sm font-black rounded-lg transition-all active:scale-[0.98] ${
            !cashSession
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          onClick={onCobrar}
          disabled={paying || selectedOrders.length === 0 || !cashSession || !canPay}
        >
          <Euro className="size-4 mr-1.5" />
          {paying ? 'Cobrando...' : 'COBRAR'}
        </Button>
        {!cashSession && (
          <p className="text-[9px] text-red-600 text-center font-medium mt-1">Abre caja para cobrar</p>
        )}
      </div>
    </div>
  )
}
