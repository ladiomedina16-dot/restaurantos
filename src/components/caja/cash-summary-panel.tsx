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
  /* ── Closed state ── */
  if (!cashSession) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="size-4 text-red-500" />
          <h4 className="text-sm font-bold text-red-700">Caja Cerrada</h4>
        </div>
        <Button
          className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg"
          onClick={onOpenCash}
        >
          <CheckCircle className="size-4 mr-1.5" />
          Abrir Caja
        </Button>
      </div>
    )
  }

  /* ── Calculations ── */
  const openingCash = cashSession.openingCash ?? 0
  const totalCash = cashSession.totalCash ?? 0
  const totalCard = cashSession.totalCard ?? 0
  const totalSuppliers = cashSession.totalSuppliers ?? supplierPayments.reduce((s, sp) => s + sp.amount, 0)
  const expectedCash = openingCash + totalCash - totalSuppliers
  const totalSales = totalCash + totalCard

  /* ── Open state ── */
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shrink-0">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <CheckCircle className="size-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-600">Caja Abierta</span>
        </div>
        <button
          type="button"
          className="text-[10px] font-semibold text-red-500 hover:text-red-700 hover:underline transition-colors"
          onClick={onCloseCash}
        >
          Cerrar
        </button>
      </div>

      {/* Cash Info */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <Wallet className="size-3" /> Apertura
          </span>
          <span className="text-[11px] font-semibold text-gray-800">{formatEUR(openingCash)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <Banknote className="size-3" /> Efectivo
          </span>
          <span className="text-[11px] font-semibold text-emerald-600">{formatEUR(totalCash)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <CreditCard className="size-3" /> Tarjeta
          </span>
          <span className="text-[11px] font-semibold text-blue-600">{formatEUR(totalCard)}</span>
        </div>

        <Separator className="bg-gray-200" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-700 font-medium flex items-center gap-1">
            <TrendingUp className="size-3" /> Ventas
          </span>
          <span className="text-xs font-bold text-emerald-600">{formatEUR(totalSales)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Esperado</span>
          <span className="text-[11px] font-semibold text-gray-800">{formatEUR(expectedCash)}</span>
        </div>

        {cashSession.openedAt && (
          <p className="text-gray-400 text-xs">
            {formatTime(cashSession.openedAt)}
            {cashSession.openedBy && ` · ${cashSession.openedBy.name ?? cashSession.openedBy.username ?? ''}`}
          </p>
        )}
      </div>

      {/* Supplier Payments */}
      <div className="border-t border-gray-100 px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Flame className="size-3.5 text-orange-500" />
            <span className="text-[11px] font-medium text-gray-700">Prov.</span>
            {supplierPayments.length > 0 && (
              <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-600 border-orange-200 px-1 py-0 h-4">
                {supplierPayments.length} · {formatEUR(totalSuppliers)}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-2 rounded"
            onClick={onAddSupplier}
          >
            <Plus className="size-3" />
          </Button>
        </div>

        {supplierPayments.length > 0 && (
          <ScrollArea className="max-h-16">
            <div className="space-y-0.5">
              {supplierPayments.map((sp) => (
                <div key={sp.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500 truncate mr-2">{sp.concept}</span>
                  <span className="text-orange-600 font-medium shrink-0">-{formatEUR(sp.amount)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
