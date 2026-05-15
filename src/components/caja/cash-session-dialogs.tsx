'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatEUR } from '@/lib/formatters'

interface CashSessionDialogsProps {
  showOpenCashDialog: boolean
  setShowOpenCashDialog: (v: boolean) => void
  showCloseCashDialog: boolean
  setShowCloseCashDialog: (v: boolean) => void
  showSupplierDialog: boolean
  setShowSupplierDialog: (v: boolean) => void
  openingCashInput: string
  setOpeningCashInput: (v: string) => void
  closingCashInput: string
  setClosingCashInput: (v: string) => void
  closingCardInput: string
  setClosingCardInput: (v: string) => void
  supplierConcept: string
  setSupplierConcept: (v: string) => void
  supplierAmount: string
  setSupplierAmount: (v: string) => void
  cashSessionLoading: boolean
  cashSession: any
  cashCloseSummary: any
  setCashCloseSummary: (v: any) => void
  addingSupplier: boolean
  onOpenCash: () => Promise<void>
  onCloseCash: () => Promise<void>
  onAddSupplier: () => Promise<void>
}

export function CashSessionDialogs({
  showOpenCashDialog,
  setShowOpenCashDialog,
  showCloseCashDialog,
  setShowCloseCashDialog,
  showSupplierDialog,
  setShowSupplierDialog,
  openingCashInput,
  setOpeningCashInput,
  closingCashInput,
  setClosingCashInput,
  closingCardInput,
  setClosingCardInput,
  supplierConcept,
  setSupplierConcept,
  supplierAmount,
  setSupplierAmount,
  cashSessionLoading,
  cashSession,
  cashCloseSummary,
  setCashCloseSummary,
  addingSupplier,
  onOpenCash,
  onCloseCash,
  onAddSupplier,
}: CashSessionDialogsProps) {
  return (
    <>
      {/* Open Cash Dialog */}
      <Dialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Efectivo de apertura (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenCashDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={cashSessionLoading || !openingCashInput}
              onClick={onOpenCash}
            >
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={showCloseCashDialog} onOpenChange={setShowCloseCashDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Cerrar Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Efectivo contado (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closingCashInput}
                onChange={(e) => setClosingCashInput(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Tarjeta contabilizada (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closingCardInput}
                onChange={(e) => setClosingCardInput(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseCashDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button
              variant="destructive"
              disabled={cashSessionLoading || !closingCashInput}
              onClick={onCloseCash}
            >
              Cerrar Caja
            </Button>
          </DialogFooter>

          {/* Close Summary */}
          {cashCloseSummary && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30 text-sm space-y-1">
              <p className="font-bold text-base mb-1 text-white">Resumen de cierre</p>
              <div className="flex justify-between text-slate-300"><span>Ventas totales:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalSales ?? 0)}</span></div>
              <div className="flex justify-between text-slate-300"><span>Efectivo sistema:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCash ?? 0)}</span></div>
              <div className="flex justify-between text-slate-300"><span>Tarjeta sistema:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCard ?? 0)}</span></div>
              <div className="flex justify-between text-slate-300"><span>Proveedores:</span><span className="font-semibold text-orange-400">-{formatEUR(cashCloseSummary.totalSuppliers ?? 0)}</span></div>
              <Separator className="bg-slate-700/50" />
              <p className="font-semibold text-sm mt-1 text-slate-200">Efectivo</p>
              <div className="flex justify-between text-slate-300"><span>Esperado:</span><span className="font-semibold">{formatEUR(cashCloseSummary.expectedCash ?? 0)}</span></div>
              <div className="flex justify-between text-slate-300"><span>Contado:</span><span className="font-semibold">{formatEUR(cashCloseSummary.closingCash ?? 0)}</span></div>
              <div className="flex justify-between text-slate-300">
                <span>Diferencia efectivo:</span>
                <span className={`font-bold ${(cashCloseSummary.difference ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatEUR(cashCloseSummary.difference ?? 0)}
                </span>
              </div>
              <Separator className="bg-slate-700/50" />
              <p className="font-semibold text-sm mt-1 text-slate-200">Tarjeta</p>
              <div className="flex justify-between text-slate-300"><span>Tarjeta sistema:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCard ?? 0)}</span></div>
              <div className="flex justify-between text-slate-300"><span>Tarjeta contada:</span><span className="font-semibold">{formatEUR(cashCloseSummary.closingCard ?? 0)}</span></div>
              <div className="flex justify-between text-slate-300">
                <span>Diferencia tarjeta:</span>
                <span className={`font-bold ${(cashCloseSummary.cardDifference ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatEUR(cashCloseSummary.cardDifference ?? 0)}
                </span>
              </div>
              <Separator className="bg-slate-700/50" />
              <div className="flex justify-between text-base text-slate-200">
                <span className="font-bold">Diferencia total:</span>
                <span className={`font-bold ${(cashCloseSummary.totalDifference ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatEUR(cashCloseSummary.totalDifference ?? 0)}
                </span>
              </div>
              {(cashCloseSummary.supplierPayments ?? []).length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/40">
                  <p className="text-xs font-semibold mb-1 text-slate-400">Pagos a proveedores:</p>
                  {(cashCloseSummary.supplierPayments ?? []).map((sp: { id: string; concept: string; amount: number; registeredBy: string }) => (
                    <div key={sp.id} className="flex justify-between text-xs text-slate-400">
                      <span>{sp.concept} ({sp.registeredBy})</span>
                      <span className="text-orange-400">-{formatEUR(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="sm" className="mt-2 text-xs text-slate-400 hover:text-white" onClick={() => setCashCloseSummary(null)}>
                Cerrar resumen
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Supplier Payment Dialog */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Pago a Proveedor</DialogTitle>
            <DialogDescription className="text-slate-400">Registrar un pago a proveedor durante la sesión de caja actual</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Concepto</Label>
              <Input
                placeholder="Ej: bebidas, pan, hielo..."
                value={supplierConcept}
                onChange={(e) => setSupplierConcept(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Monto (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={supplierAmount}
                onChange={(e) => setSupplierAmount(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={addingSupplier || !supplierConcept.trim() || !supplierAmount}
              onClick={onAddSupplier}
            >
              {addingSupplier ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
