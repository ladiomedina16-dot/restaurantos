'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/common/auth-context'
import { toast } from 'sonner'
import type { TableItem, Order, SupplierPaymentItem } from '@/types/restaurant'
import { formatEUR } from '@/lib/formatters'

// ─── Sub-components ──────────────────────────────────────────────────────────
import { TablesPanel } from '@/components/caja/tables-panel'
import { OrderDetailPanel } from '@/components/caja/order-detail-panel'
import { PaymentPanel, type PaymentMethod } from '@/components/caja/payment-panel'
import { QuickProductsPanel } from '@/components/caja/quick-products-panel'
import { CashSummaryPanel } from '@/components/caja/cash-summary-panel'
import { CashSessionDialogs } from '@/components/caja/cash-session-dialogs'
import { Calculator } from '@/components/caja/calculator'

// ─── CAJA TAB — POS Modern Layout ────────────────────────────────────────────

export function CajaTab() {
  // ─── Core State ────────────────────────────────────────────────
  const [tables, setTables] = useState<TableItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingTable, setPayingTable] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('efectivo')
  const { authHeaders, handleFetchResponse } = useAuth()

  // ─── Mixto Payment State ───────────────────────────────────────
  const [mixtoEfectivo, setMixtoEfectivo] = useState('')
  const [mixtoTarjeta, setMixtoTarjeta] = useState('')

  // ─── Cash Session State ────────────────────────────────────────
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

  // ─── History Dialog State (future expansion) ───────────────────
  const [showHistory, setShowHistory] = useState(false)

  // ─── Fetch Callbacks (PRESERVED EXACTLY) ──────────────────────
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
      const res = await fetch('/api/orders?status=pending,in_progress,ready,served', { headers: authHeaders(false) })
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

  // ─── Effects (PRESERVED) ───────────────────────────────────────
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

  // ─── Business Logic (PRESERVED EXACTLY) ───────────────────────
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
        const res = await fetch(`/api/orders/${order.id}/pay`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ applyDiscount: true, paymentMethod: selectedPaymentMethod }),
        })
        if (!handleFetchResponse(res) || !res.ok) {
          const err = await res.json()
          toast.error(err.error || 'Error al cobrar pedido')
          setPaying(false)
          return
        }
      }
      toast.success(`Mesa ${selectedTable?.number ?? '?'} cobrada — ${formatEUR(total)}`)
      setPayingTable(null)
      setSelectedPaymentMethod('efectivo')
      setMixtoEfectivo('')
      setMixtoTarjeta('')
      fetchTables()
      fetchActiveOrders()
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

  // ─── Dialog Handlers (PRESERVED) ──────────────────────────────
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

  // ─── Loading State ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] bg-slate-950 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-3 h-full">
          <Skeleton className="rounded-xl bg-slate-800/50" />
          <Skeleton className="rounded-xl bg-slate-800/50" />
          <Skeleton className="rounded-xl bg-slate-800/50" />
        </div>
      </div>
    )
  }

  // ─── POS Layout ────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-3">
      {/* 3-Column Main Area */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* LEFT COLUMN — Occupied Tables */}
        <div className="col-span-3 min-h-0">
          <TablesPanel
            tables={tables}
            orders={orders}
            selectedTableId={selectedTableId}
            onSelectTable={setPayingTable}
            onRefresh={() => { fetchTables(); fetchActiveOrders() }}
            getTableOrders={getTableOrders}
            hasReadyOrders={hasReadyOrders}
            now={now}
          />
        </div>

        {/* CENTER COLUMN — Order Detail + Payment */}
        <div className="col-span-5 flex flex-col gap-3 min-h-0">
          {/* Order Detail (takes most space) */}
          <div className="flex-1 min-h-0">
            <OrderDetailPanel
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
              onBack={() => setPayingTable(null)}
              onCancelOrder={handleCancelOrder}
            />
          </div>

          {/* Payment Panel (fixed height) */}
          <PaymentPanel
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
            onCobrar={handleCobrar}
            paying={paying}
            total={total}
            cashSession={cashSession}
            selectedOrders={selectedOrders}
            authHeaders={authHeaders}
            mixtoEfectivo={mixtoEfectivo}
            mixtoTarjeta={mixtoTarjeta}
            onMixtoEfectivoChange={setMixtoEfectivo}
            onMixtoTarjetaChange={setMixtoTarjeta}
            onCancelOrder={handleCancelOrder}
            onShowHistory={() => setShowHistory(true)}
          />
        </div>

        {/* RIGHT COLUMN — Quick Products + Cash Summary */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          {/* Quick Products (takes most space) */}
          <div className="flex-1 min-h-0">
            <QuickProductsPanel
              authHeaders={authHeaders}
              handleFetchResponse={handleFetchResponse}
            />
          </div>

          {/* Cash Summary (fixed height) */}
          <CashSummaryPanel
            cashSession={cashSession}
            onOpenCash={() => setShowOpenCashDialog(true)}
            onCloseCash={() => setShowCloseCashDialog(true)}
            supplierPayments={supplierPayments}
            onAddSupplier={() => setShowSupplierDialog(true)}
          />
        </div>
      </div>

      {/* BOTTOM — Calculator */}
      <div className="shrink-0">
        <Calculator />
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────── */}
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
