'use client'

import { useEffect, useRef } from 'react'
import {
  Lock, CheckCircle, Wallet, Banknote, CreditCard,
  TrendingUp, Flame, Plus, X, Clock, RefreshCw,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatEUR, formatTime } from '@/lib/formatters'
import type { SupplierPaymentItem } from '@/types/restaurant'

interface CashSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cashSession: any
  supplierPayments: SupplierPaymentItem[]
  onOpenCash: () => void
  onCloseCash: () => void
  onAddSupplier: () => void
  onRefresh?: () => void
}

export function CashSummaryDialog({
  open,
  onOpenChange,
  cashSession,
  supplierPayments,
  onOpenCash,
  onCloseCash,
  onAddSupplier,
  onRefresh,
}: CashSummaryDialogProps) {
  // Refresh data when dialog opens
  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current && onRefresh) {
      onRefresh()
    }
    prevOpenRef.current = open
  }, [open, onRefresh])
  /* ── Closed state ── */
  if (!cashSession) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200 p-0 gap-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-800">Resumen de Caja</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-50 border border-red-200">
              <Lock className="size-8 text-red-500" />
              <div>
                <p className="text-lg font-bold text-red-700">Caja Cerrada</p>
                <p className="text-sm text-red-400">Abre caja para comenzar a operar</p>
              </div>
            </div>
            <Button
              className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg px-8"
              onClick={onOpenCash}
            >
              <CheckCircle className="size-4 mr-1.5" />
              Abrir Caja
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  /* ── Calculations ── */
  const openingCash = cashSession.openingCash ?? 0
  const totalCash = cashSession.totalCash ?? 0
  const totalCard = cashSession.totalCard ?? 0
  const totalSuppliers = cashSession.totalSuppliers ?? supplierPayments.reduce((s, sp) => s + sp.amount, 0)
  const expectedCash = cashSession.expectedCash ?? (openingCash + totalCash - totalSuppliers)
  const totalSales = cashSession.totalSales ?? (totalCash + totalCard)

  /* ── Open state ── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white border-gray-200 p-0 gap-0 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-800">Resumen de Caja</h2>
            <Badge className="bg-emerald-600 text-white text-[10px] border-0">
              <CheckCircle className="size-3 mr-1" />
              Abierta
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                onClick={onRefresh}
                title="Actualizar datos"
              >
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-4">
            {/* Session info */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="size-4" />
              <span>Abierta: {formatTime(cashSession.openedAt)}</span>
              {cashSession.openedBy && (
                <span className="text-gray-400">
                  · {cashSession.openedBy.name ?? cashSession.openedBy.username ?? ''}
                </span>
              )}
            </div>

            {/* Cash details grid */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Wallet className="size-4" /> Apertura
                </span>
                <span className="text-sm font-bold text-gray-800">{formatEUR(openingCash)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Banknote className="size-4" /> Efectivo
                </span>
                <span className="text-sm font-bold text-emerald-600">{formatEUR(totalCash)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <CreditCard className="size-4" /> Tarjeta
                </span>
                <span className="text-sm font-bold text-blue-600">{formatEUR(totalCard)}</span>
              </div>

              <Separator className="bg-gray-200" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <TrendingUp className="size-4" /> Ventas
                </span>
                <span className="text-base font-black text-emerald-600">{formatEUR(totalSales)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Esperado en caja</span>
                <span className="text-sm font-bold text-gray-800">{formatEUR(expectedCash)}</span>
              </div>
            </div>

            {/* Supplier payments section */}
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-700">Proveedores</span>
                  {supplierPayments.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-600 border-orange-300 px-1.5 py-0">
                      {supplierPayments.length} · {formatEUR(totalSuppliers)}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  onClick={onAddSupplier}
                >
                  <Plus className="size-3.5 mr-1" />
                  Añadir
                </Button>
              </div>

              {supplierPayments.length > 0 ? (
                <div className="space-y-1.5">
                  {supplierPayments.map((sp) => (
                    <div key={sp.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                      <span className="text-sm text-gray-700 truncate mr-3">{sp.concept}</span>
                      <span className="text-sm font-bold text-orange-600 shrink-0">-{formatEUR(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-orange-400 text-center py-2">Sin pagos a proveedores</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 h-11 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white"
                onClick={onCloseCash}
              >
                Cerrar Caja
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
