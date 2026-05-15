'use client'

import { Lock, CheckCircle, Wallet, Banknote, CreditCard, TrendingUp, Flame, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatEUR, formatTime } from '@/lib/formatters'
import type { SupplierPaymentItem } from '@/types/restaurant'

interface CashSummaryPanelProps {
  cashSession: any
  onOpenCash: () => void
  onCloseCash: () => void
  supplierPayments: SupplierPaymentItem[]
  onAddSupplier: () => void
}

export function CashSummaryPanel({
  cashSession,
  onOpenCash,
  onCloseCash,
  supplierPayments,
  onAddSupplier,
}: CashSummaryPanelProps) {
  if (!cashSession) {
    return (
      <div className="bg-red-950/30 rounded-xl border border-red-700/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="size-5 text-red-400" />
          <h4 className="text-sm font-bold text-red-300">Caja Cerrada</h4>
        </div>
        <p className="text-xs text-slate-400 mb-3">Debes abrir caja para poder cobrar</p>
        <Button
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg"
          onClick={onOpenCash}
        >
          <CheckCircle className="size-4 mr-2" />
          Abrir Caja
        </Button>
      </div>
    )
  }

  // Calculate cash summary from session data
  const openingCash = cashSession.openingCash ?? 0
  const totalCash = cashSession.totalCash ?? 0
  const totalCard = cashSession.totalCard ?? 0
  const totalSuppliers = cashSession.totalSuppliers ?? supplierPayments.reduce((s, sp) => s + sp.amount, 0)
  const expectedCash = openingCash + totalCash - totalSuppliers
  const totalSales = totalCash + totalCard

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
      {/* Session Status */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Caja Abierta</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-red-700/30 px-2"
          onClick={onCloseCash}
        >
          Cerrar Caja
        </Button>
      </div>

      {/* Cash Info Grid */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Wallet className="size-3" /> Apertura
          </span>
          <span className="text-xs font-semibold text-white">{formatEUR(openingCash)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Banknote className="size-3" /> Efectivo
          </span>
          <span className="text-xs font-semibold text-emerald-400">{formatEUR(totalCash)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CreditCard className="size-3" /> Tarjeta
          </span>
          <span className="text-xs font-semibold text-sky-400">{formatEUR(totalCard)}</span>
        </div>
        <Separator className="bg-slate-700/40" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <TrendingUp className="size-3" /> Total Ventas
          </span>
          <span className="text-sm font-bold text-amber-400">{formatEUR(totalSales)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Wallet className="size-3" /> Esperado en caja
          </span>
          <span className="text-xs font-semibold text-white">{formatEUR(expectedCash)}</span>
        </div>

        {/* Opened by / time */}
        <div className="text-[10px] text-slate-500 pt-1">
          {cashSession.openedAt && `Abierta: ${formatTime(cashSession.openedAt)}`}
          {cashSession.openedBy && ` · Por: ${cashSession.openedBy.name ?? cashSession.openedBy.username ?? ''}`}
        </div>
      </div>

      {/* Supplier Payments */}
      <div className="border-t border-slate-700/40 px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Flame className="size-3.5 text-orange-400" />
            <span className="text-xs font-semibold text-slate-300">Proveedores</span>
            {supplierPayments.length > 0 && (
              <Badge variant="outline" className="text-[9px] bg-orange-900/20 text-orange-300 border-orange-600/30 px-1 py-0">
                {supplierPayments.length} · {formatEUR(totalSuppliers)}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] bg-orange-900/20 text-orange-300 hover:bg-orange-900/30 border border-orange-600/30 px-2"
            onClick={onAddSupplier}
          >
            <Plus className="size-3 mr-0.5" />
            Añadir
          </Button>
        </div>
        {supplierPayments.length > 0 ? (
          <ScrollArea className="max-h-20">
            <div className="space-y-1">
              {supplierPayments.map((sp) => (
                <div key={sp.id} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-slate-400 truncate mr-2">
                    {sp.concept} · {sp.user?.name || sp.user?.username || '—'}
                  </span>
                  <span className="text-orange-400 font-medium shrink-0">-{formatEUR(sp.amount)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-[10px] text-slate-600">Sin pagos a proveedores</p>
        )}
      </div>
    </div>
  )
}
