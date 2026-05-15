'use client'

import { ArrowLeft, Receipt, Clock, XCircle, UserCircle, Phone, Star, Beer, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatEUR, formatTime } from '@/lib/formatters'
import { orderStatusConfig } from '@/lib/constants'
import type { Order } from '@/types/restaurant'

interface OrderDetailPanelProps {
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
}: OrderDetailPanelProps) {
  if (!selectedTable) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg">
        <Receipt className="size-16 text-slate-600 mb-3" />
        <p className="text-slate-400 text-lg font-medium">Selecciona una mesa</p>
        <p className="text-slate-500 text-sm mt-1">Elige una mesa ocupada para ver su cuenta</p>
      </div>
    )
  }

  const ivaRate = 0.10 // 10% IVA
  const baseImponible = total / (1 + ivaRate)
  const ivaAmount = total - baseImponible

  return (
    <div className="h-full flex flex-col bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/40">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-slate-400 hover:text-amber-400 hover:bg-slate-800"
          onClick={onBack}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">Mesa {selectedTable.number}</h3>
          <p className="text-xs text-slate-400">{selectedOrders.length} pedido{selectedOrders.length !== 1 ? 's' : ''} activo{selectedOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <Badge variant="outline" className="text-xs bg-amber-900/30 text-amber-300 border-amber-700/40">
          {allItems.length} items
        </Badge>
      </div>

      {/* Client Info */}
      {clientInfo && (
        <div className="mx-4 mt-3 p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
          <div className="flex items-center gap-2">
            <UserCircle className="size-5 text-amber-400" />
            <span className="font-semibold text-amber-200">{clientInfo.name}</span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Phone className="size-3" />{clientInfo.phone}
            </span>
            {clientInfo.points !== undefined && (
              <span className="flex items-center gap-1">
                <Star className="size-3 text-amber-400" />{clientInfo.points} pts
              </span>
            )}
            {clientInfo.visits !== undefined && (
              <span>Visitas: {clientInfo.visits}</span>
            )}
          </div>
        </div>
      )}

      {/* Items Table */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-1.5">
          {selectedOrders.map((order) => (
            <div key={order.id} className="mb-3">
              {/* Order status bar */}
              <div className="flex items-center justify-between mb-1.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${
                    order.status === 'ready'
                      ? 'bg-emerald-900/30 text-emerald-300 border-emerald-600/30'
                      : order.status === 'pending'
                      ? 'bg-amber-900/30 text-amber-300 border-amber-600/30'
                      : 'bg-orange-900/30 text-orange-300 border-orange-600/30'
                  }`}
                >
                  {order.status === 'ready' ? '✅ Listo' : order.status === 'pending' ? '⏳ Pendiente' : '🔥 En curso'}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="size-3" />{formatTime(order.createdAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                    onClick={() => onCancelOrder(order.id)}
                    title="Cancelar pedido"
                  >
                    <XCircle className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Items */}
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-bold text-amber-400 w-7 text-right shrink-0">
                      {item.quantity}×
                    </span>
                    <span className="text-sm text-slate-200 truncate">
                      {item.product?.name ?? 'Producto'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-xs text-slate-500">
                      {formatEUR(item.unitPrice)}
                    </span>
                    <span className="text-sm font-semibold text-white w-20 text-right">
                      {formatEUR(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}

              {order.client && !clientInfo && (
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <UserCircle className="size-3" />
                  {order.client.name}
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Totals Footer */}
      <div className="border-t border-slate-700/40 px-4 py-3 space-y-1.5 bg-slate-950/40">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Subtotal</span>
          <span>{formatEUR(subtotal)}</span>
        </div>

        {/* 5ª Gratis */}
        {hasClient && freeDrinks > 0 && (
          <div className="flex justify-between text-sm text-emerald-400">
            <span className="flex items-center gap-1">
              <Beer className="size-3" />
              5ª GRATIS ({freeDrinks} bebida{freeDrinks > 1 ? 's' : ''})
            </span>
            <span>-{formatEUR(finalDiscount)}</span>
          </div>
        )}
        {hasClient && bebidasTotal > 0 && freeDrinks === 0 && (
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Beer className="size-3" />
            {bebidasTotal}/5 bebidas para 5ª gratis
          </div>
        )}
        {!hasClient && bebidasTotal >= 5 && (
          <div className="text-[10px] text-amber-500 flex items-center gap-1">
            <Beer className="size-3" />
            Asigna cliente para 5ª gratis ({bebidasTotal} bebidas)
          </div>
        )}

        <div className="flex justify-between text-xs text-slate-500">
          <span>IVA (10%)</span>
          <span>{formatEUR(ivaAmount)}</span>
        </div>

        <Separator className="bg-slate-700/50" />

        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-white">TOTAL</span>
          <span className="text-2xl font-black text-amber-400 tracking-tight">
            {formatEUR(total)}
          </span>
        </div>

        {pointsEarned > 0 && (
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Star className="size-3 text-amber-400" />
            Puntos a ganar: <span className="font-bold text-amber-400">{pointsEarned}</span>
          </div>
        )}
      </div>
    </div>
  )
}
