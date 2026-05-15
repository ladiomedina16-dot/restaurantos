'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/common/auth-context'
import { toast } from 'sonner'
import type { TableItem, Order, SupplierPaymentItem } from '@/types/restaurant'
import { formatEUR, formatTime } from '@/lib/formatters'
import { handlePrintTicket } from '@/lib/print-client'

// ─── Sub-components ──────────────────────────────────────────────────────────
import { TablesPanel } from '@/components/caja/tables-panel'
import { type PaymentMethod } from '@/components/caja/payment-panel'
import { QuickProductsPanel } from '@/components/caja/quick-products-panel'
import { CashSummaryDialog } from '@/components/caja/cash-summary-dialog'
import { CashSessionDialogs } from '@/components/caja/cash-session-dialogs'
import { TablePaymentDialog } from '@/components/caja/table-payment-dialog'
import { Calculator } from '@/components/caja/calculator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Store, Clock, User, LogOut, Unlock, Wallet } from 'lucide-react'

// ─── CAJA TAB — Light-themed POS Layout ─────────────────────────────────────

export function CajaTab() {
  // ─── Core State (PRESERVED) ────────────────────────────────
  const [tables, setTables] = useState<TableItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingTable, setPayingTable] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('efectivo')
  const { authHeaders, handleFetchResponse } = useAuth()

  // ─── Mixto Payment State (PRESERVED) ───────────────────────
  const [mixtoEfectivo, setMixtoEfectivo] = useState('')
  const [mixtoTarjeta, setMixtoTarjeta] = useState('')

  // ─── Cash Session State (PRESERVED) ────────────────────────
  const [cashSession, setCashSession] = useState<any>(null)
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false)
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false)
  const [openingCashInput, setOpeningCashInput] = useState('')
  const [closingCashInput, setClosingCashInput] = useState('')
  const [closingCardInput, setClosingCardInput] = useState('')
  const [cashSessionLoading, setCashSessionLoading] = useState(false)
  const [cashCloseSummary, setCashCloseSummary] = useState<any>(null)
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentItem[]>([])
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [supplierConcept, setSupplierConcept] = useState('')
  const [supplierAmount, setSupplierAmount] = useState('')
  const [addingSupplier, setAddingSupplier] = useState(false)

  // ─── History Dialog State (PRESERVED) ──────────────────────
  const [showHistory, setShowHistory] = useState(false)

  // ─── Calculator Dialog State (PRESERVED) ───────────────────
  const [showCalculator, setShowCalculator] = useState(false)

  // ─── Payment Dialog State ─────────────────────────────────────
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  // ─── Cash Summary Dialog State ────────────────────────────────
  const [showCashSummary, setShowCashSummary] = useState(false)

  // ─── Fetch Callbacks (PRESERVED EXACTLY) ───────────────────
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setTables(json.tables.filter((t: TableItem) => t.active))
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse])

  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?status=pending,in_progress,ready,served,bill_requested', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setOrders(json.orders)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse])

  const fetchCashSession = useCallback(async () => {
    try {
      const res = await fetch('/api/cash-sessions?current=true', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        if (json.sessions && json.sessions.length > 0) {
          setCashSession(json.sessions[0])
        } else if (json.cashSession) {
          setCashSession(json.cashSession)
        } else {
          setCashSession(null)
        }
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse])

  const fetchSupplierPayments = useCallback(async () => {
    if (!cashSession?.id) { setSupplierPayments([]); return }
    try {
      const res = await fetch(`/api/supplier-payments?cashSessionId=${cashSession.id}`, { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setSupplierPayments(json.supplierPayments)
      }
    } catch { /* silently fail */ }
  }, [authHeaders, handleFetchResponse, cashSession])

  // ─── Effects (PRESERVED) ───────────────────────────────────
  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTables(), fetchActiveOrders(), fetchCashSession()])
      setLoading(false)
    }
    load()
    const interval = setInterval(() => { fetchTables(); fetchActiveOrders() }, 8000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchActiveOrders, fetchCashSession])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchSupplierPayments()
  }, [fetchSupplierPayments])

  // ─── Business Logic (PRESERVED EXACTLY) ────────────────────
  const getTableOrders = (tableId: string) =>
    orders.filter((o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status))

  const hasReadyOrders = (tableId: string) =>
    getTableOrders(tableId).some((o) => o.status === 'ready')

  const selectedTableId = payingTable
  const selectedTable = tables.find((t) => t.id === selectedTableId)
  const selectedOrders = selectedTableId ? getTableOrders(selectedTableId) : []

  const allItems = selectedOrders.flatMap((o) => o.items)
  const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0)

  // 5ª Gratis calculation
  const bebidasTotal = allItems
    .filter((i) => i.product?.category === 'bebida')
    .reduce((s, i) => s + i.quantity, 0)
  const freeDrinks = Math.floor(bebidasTotal / 5)
  const discount = freeDrinks * 1.50
  const hasClient = selectedOrders.some((o) => o.clientId !== null)
  const finalDiscount = hasClient ? discount : 0
  const total = Math.max(0, subtotal - finalDiscount)
  const pointsEarned = Math.floor(total)

  const clientInfo = selectedOrders.find((o) => o.client)?.client

  const handleCobrar = async () => {
    if (!selectedTableId || selectedOrders.length === 0) return
    if (!cashSession) {
      toast.error('Abre caja para poder cobrar')
      return
    }
    setPaying(true)
    try {
      for (const order of selectedOrders) {
        // Build payment body with mixto split amounts
        const payBody: Record<string, unknown> = {
          applyDiscount: true,
          paymentMethod: selectedPaymentMethod,
        }
        if (selectedPaymentMethod === 'mixto') {
          payBody.amountCash = parseFloat(mixtoEfectivo) || 0
          payBody.amountCard = parseFloat(mixtoTarjeta) || 0
        }

        const res = await fetch(`/api/orders/${order.id}/pay`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payBody),
        })
        if (!handleFetchResponse(res) || !res.ok) {
          const err = await res.json()
          toast.error(err.error || 'Error al cobrar pedido')
          setPaying(false)
          return
        }
      }
      toast.success(`Mesa ${selectedTable?.number ?? '?'} cobrada — ${formatEUR(total)}`)

      // Auto-print ticket for each paid order (fire-and-forget, don't block)
      for (const order of selectedOrders) {
        handlePrintTicket('receipt', order.id, authHeaders, 'ticket').catch(() => {
          toast.error('No se pudo imprimir el ticket automáticamente')
        })
      }

      setPayingTable(null)
      setShowPaymentDialog(false)
      setSelectedPaymentMethod('efectivo')
      setMixtoEfectivo('')
      setMixtoTarjeta('')
      // Refresh data sequentially: cash session first (supplier payments depend on it)
      await fetchTables()
      await fetchActiveOrders()
      await fetchCashSession()
      // fetchSupplierPayments depends on cashSession.id which updates after fetchCashSession
      // We need to fetch supplier payments AFTER cash session state is updated
      // Since React state updates are async, we fetch directly here using the known session ID
      if (cashSession?.id) {
        try {
          const spRes = await fetch(`/api/supplier-payments?cashSessionId=${cashSession.id}`, { headers: authHeaders(false) })
          if (handleFetchResponse(spRes) && spRes.ok) {
            const spJson = await spRes.json()
            setSupplierPayments(spJson.supplierPayments)
          }
        } catch { /* silently fail */ }
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setPaying(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Pedido cancelado')
        fetchActiveOrders()
        fetchTables()
      } else {
        let errorMsg = 'Error al cancelar pedido'
        try {
          const err = await res.json()
          errorMsg = err.error || errorMsg
        } catch { /* not JSON */ }
        toast.error(errorMsg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      toast.error(msg)
    }
  }

  // ─── Dialog Handlers (PRESERVED) ───────────────────────────
  const handleOpenCash = async () => {
    setCashSessionLoading(true)
    try {
      const res = await fetch('/api/cash-sessions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ openingCash: parseFloat(openingCashInput) }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Caja abierta correctamente')
        setShowOpenCashDialog(false)
        setOpeningCashInput('')
        fetchCashSession()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al abrir caja')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setCashSessionLoading(false)
    }
  }

  const handleCloseCash = async () => {
    setCashSessionLoading(true)
    try {
      const res = await fetch(`/api/cash-sessions/${cashSession.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          closingCash: parseFloat(closingCashInput),
          closingCard: parseFloat(closingCardInput) || 0,
        }),
      })
      if (handleFetchResponse(res) && res.ok) {
        const data = await res.json()
        setCashCloseSummary(data.cashSession ?? data)
        toast.success('Caja cerrada correctamente')
        setShowCloseCashDialog(false)
        setClosingCashInput('')
        setClosingCardInput('')
        setCashSession(null)
        fetchCashSession()
      } else {
        let errorMsg = 'Error al cerrar caja'
        try {
          const err = await res.json()
          errorMsg = err.error || errorMsg
        } catch { /* not JSON */ }
        toast.error(errorMsg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      toast.error(msg)
    } finally {
      setCashSessionLoading(false)
    }
  }

  const handleAddSupplier = async () => {
    if (!supplierConcept.trim() || !supplierAmount) return
    setAddingSupplier(true)
    try {
      const res = await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ concept: supplierConcept.trim(), amount: parseFloat(supplierAmount) }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Pago a proveedor registrado')
        setSupplierConcept('')
        setSupplierAmount('')
        setShowSupplierDialog(false)
        fetchSupplierPayments()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al registrar pago')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setAddingSupplier(false)
    }
  }

  // ─── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-gray-100 rounded-lg p-4">
        <div className="grid grid-cols-[1fr_360px] gap-0 h-full">
          <Skeleton className="rounded-lg" />
          <Skeleton className="rounded-lg" />
        </div>
      </div>
    )
  }

  // ─── Light-themed POS Layout ───────────────────────────────
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-100 rounded-lg overflow-hidden">
      {/* ─── Header Bar ─────────────────────────────────────── */}
      <header className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between shrink-0 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Store className="size-5" />
          <h1 className="text-sm font-bold tracking-wide">RESTAURANTE — PUNTO DE VENTA</h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {cashSession ? (
            <>
              <Badge className="bg-emerald-600 text-white text-[10px] hover:bg-emerald-600 border-0">
                Caja Abierta
              </Badge>
              <span className="text-slate-300 flex items-center gap-1">
                <Clock className="size-3" />
                {formatTime(cashSession.openedAt)}
              </span>
            </>
          ) : (
            <Badge variant="destructive" className="text-[10px]">
              Caja Cerrada
            </Badge>
          )}
          <Button
            size="sm"
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs h-7 gap-1"
            onClick={() => setShowCashSummary(true)}
          >
            <Wallet className="size-3" />
            Resumen de Caja
          </Button>
          <span className="text-slate-300 flex items-center gap-1">
            <User className="size-3" />
            Cajero
          </span>
          {cashSession ? (
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-7"
              onClick={() => setShowCloseCashDialog(true)}
            >
              <LogOut className="size-3 mr-1" />
              CERRAR CAJA
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
              onClick={() => setShowOpenCashDialog(true)}
            >
              <Unlock className="size-3 mr-1" />
              ABRIR CAJA
            </Button>
          )}
        </div>
      </header>

      {/* ─── 2-Column Main: Tables (70%) | Products (30%) ─── */}
      <div className="flex-1 grid grid-cols-[1fr_360px] gap-0 min-h-0 border-x border-gray-200">
        {/* LEFT/CENTER: Mesas Ocupadas — ocupa ~70% del ancho */}
        <div className="min-h-0 border-r border-gray-200">
          <TablesPanel
            tables={tables}
            orders={orders}
            selectedTableId={selectedTableId}
            onSelectTable={(tableId) => {
              setPayingTable(tableId)
              setShowPaymentDialog(true)
            }}
            onRefresh={() => { fetchTables(); fetchActiveOrders() }}
            getTableOrders={getTableOrders}
            hasReadyOrders={hasReadyOrders}
            now={now}
          />
        </div>

        {/* RIGHT: Products (full height) */}
        <div className="min-h-0">
          <QuickProductsPanel
            authHeaders={authHeaders}
            handleFetchResponse={handleFetchResponse}
          />
        </div>
      </div>

      {/* ─── Calculator Dialog ──────────────────────────────── */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="sm:max-w-sm bg-white border-gray-200 p-4 gap-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Calculadora</DialogTitle>
          </DialogHeader>
          <Calculator />
        </DialogContent>
      </Dialog>

      {/* ─── Table Payment Dialog ───────────────────────────── */}
      <TablePaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        selectedTable={selectedTable ? { id: selectedTable.id, number: selectedTable.number, zone: selectedTable.zone } : undefined}
        selectedOrders={selectedOrders}
        allItems={allItems}
        subtotal={subtotal}
        finalDiscount={finalDiscount}
        total={total}
        hasClient={hasClient}
        freeDrinks={freeDrinks}
        bebidasTotal={bebidasTotal}
        clientInfo={clientInfo ?? null}
        pointsEarned={pointsEarned}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
        mixtoEfectivo={mixtoEfectivo}
        mixtoTarjeta={mixtoTarjeta}
        onMixtoEfectivoChange={setMixtoEfectivo}
        onMixtoTarjetaChange={setMixtoTarjeta}
        onCobrar={handleCobrar}
        paying={paying}
        cashSession={cashSession}
        authHeaders={authHeaders}
        onCancelOrder={handleCancelOrder}
        onShowCalculator={() => setShowCalculator(true)}
      />

      {/* ─── Cash Summary Dialog ──────────────────────────────── */}
      <CashSummaryDialog
        open={showCashSummary}
        onOpenChange={setShowCashSummary}
        cashSession={cashSession}
        supplierPayments={supplierPayments}
        onOpenCash={() => { setShowCashSummary(false); setShowOpenCashDialog(true) }}
        onCloseCash={() => { setShowCashSummary(false); setShowCloseCashDialog(true) }}
        onAddSupplier={() => setShowSupplierDialog(true)}
        onRefresh={() => { fetchCashSession(); if (cashSession?.id) { fetch(`/api/supplier-payments?cashSessionId=${cashSession.id}`, { headers: authHeaders(false) }).then(r => r.ok ? r.json() : null).then(j => j && setSupplierPayments(j.supplierPayments)).catch(() => {}) } }}
      />

      {/* ─── Cash Session Dialogs ───────────────────────────── */}
      <CashSessionDialogs
        showOpenCashDialog={showOpenCashDialog}
        setShowOpenCashDialog={setShowOpenCashDialog}
        showCloseCashDialog={showCloseCashDialog}
        setShowCloseCashDialog={setShowCloseCashDialog}
        showSupplierDialog={showSupplierDialog}
        setShowSupplierDialog={setShowSupplierDialog}
        openingCashInput={openingCashInput}
        setOpeningCashInput={setOpeningCashInput}
        closingCashInput={closingCashInput}
        setClosingCashInput={setClosingCashInput}
        closingCardInput={closingCardInput}
        setClosingCardInput={setClosingCardInput}
        supplierConcept={supplierConcept}
        setSupplierConcept={setSupplierConcept}
        supplierAmount={supplierAmount}
        setSupplierAmount={setSupplierAmount}
        cashSessionLoading={cashSessionLoading}
        cashSession={cashSession}
        cashCloseSummary={cashCloseSummary}
        setCashCloseSummary={setCashCloseSummary}
        addingSupplier={addingSupplier}
        onOpenCash={handleOpenCash}
        onCloseCash={handleCloseCash}
        onAddSupplier={handleAddSupplier}
      />
    </div>
  )
}
