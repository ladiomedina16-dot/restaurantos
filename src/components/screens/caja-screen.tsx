'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Phone,
  Star,
  Flame,
  Beer,
  UserCircle,
  Euro,
  CreditCard,
  Receipt,
  Plus,
  CircleDot,
  Lock,
  Printer,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/components/common/auth-context'
import { toast } from 'sonner'
import type { TableItem, Order, SupplierPaymentItem } from '@/types/restaurant'
import { formatEUR, formatTime } from '@/lib/formatters'
import { handlePrintTicket } from '@/lib/print-client'
import { zoneOrder } from '@/lib/constants'
import { zoneConfig } from '@/lib/config-ui'

// ─── CAJA TAB (Cash Register) ───────────────────────────────────────────────

export function CajaTab() {
  const [tables, setTables] = useState<TableItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingTable, setPayingTable] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const { authHeaders, handleFetchResponse } = useAuth()

  // ─── Cash Session State ──────────────────────────────────────
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

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTables(), fetchActiveOrders(), fetchCashSession()])
      setLoading(false)
    }
    load()
    const interval = setInterval(() => { fetchTables(); fetchActiveOrders() }, 8000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchActiveOrders, fetchCashSession])

  // Update time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  // Polling: caja refreshes via interval (Vercel-compatible, no Socket.io)

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

  useEffect(() => {
    fetchSupplierPayments()
  }, [fetchSupplierPayments])

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

  // Get orders for a table
  const getTableOrders = (tableId: string) =>
    orders.filter((o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status))

  // Check if table has "ready" orders
  const hasReadyOrders = (tableId: string) =>
    getTableOrders(tableId).some((o) => o.status === 'ready')

  // Selected table for payment
  const selectedTableId = payingTable
  const selectedTable = tables.find((t) => t.id === selectedTableId)
  const selectedOrders = selectedTableId ? getTableOrders(selectedTableId) : []

  // Calculate totals for selected table
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

  // Get the client info from orders
  const clientInfo = selectedOrders.find((o) => o.client)?.client

  const handleCobrar = async () => {
    if (!selectedTableId || selectedOrders.length === 0) return
    if (!cashSession) {
      toast.error('Abre caja para poder cobrar')
      return
    }
    setPaying(true)
    try {
      // Pay each order
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

  // Group tables by zone
  const tablesByZone = zoneOrder
    .map((z) => ({
      zone: z,
      config: zoneConfig[z],
      tables: tables.filter((t) => t.zone === z),
    }))
    .filter((g) => g.tables.length > 0)

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  // ─── Payment Panel ──────────────────────────────────────────
  if (selectedTableId && selectedTable) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-12" onClick={() => setPayingTable(null)}>
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="text-2xl font-bold">Mesa {selectedTable.number}</h2>
          <span className="text-muted-foreground">{zoneConfig[selectedTable.zone]?.label ?? selectedTable.zone}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Orders & Items */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="size-5" />
                Pedidos activos ({selectedOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                {selectedOrders.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay pedidos activos</p>
                ) : (
                  <div className="space-y-4">
                    {selectedOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className={
                              order.status === 'ready'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : order.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-orange-100 text-orange-800 border-orange-200'
                            }
                          >
                            {order.status === 'ready' ? '✅ Listo' : order.status === 'pending' ? '⏳ Pendiente' : '🔥 En curso'}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleCancelOrder(order.id)}
                              title="Cancelar pedido"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                <span className="font-medium">{item.quantity}x</span>{' '}
                                {item.product?.name ?? 'Producto'}
                              </span>
                              <span className="text-muted-foreground">{formatEUR(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                        {order.client && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <UserCircle className="size-3 inline mr-1" />
                            {order.client.name} · {order.client.phone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Totals & Pay */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="size-5" />
                Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client info */}
              {clientInfo && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <UserCircle className="size-5 text-amber-600" />
                    <span className="font-semibold">{clientInfo.name}</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span><Phone className="size-3 inline mr-1" />{clientInfo.phone}</span>
                    {clientInfo.points !== undefined && <span><Star className="size-3 inline mr-1" />{clientInfo.points} pts</span>}
                    {clientInfo.visits !== undefined && <span>Visitas: {clientInfo.visits}</span>}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatEUR(subtotal)}</span>
                </div>

                {/* 5ª Gratis */}
                {hasClient && freeDrinks > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>
                      <Beer className="size-3 inline mr-1" />
                      5ª GRATIS: {freeDrinks} bebida{freeDrinks > 1 ? 's' : ''} gratis
                    </span>
                    <span>-{formatEUR(finalDiscount)}</span>
                  </div>
                )}
                {hasClient && bebidasTotal > 0 && freeDrinks === 0 && (
                  <div className="text-xs text-muted-foreground">
                    <Beer className="size-3 inline mr-1" />
                    {bebidasTotal}/5 bebidas para 5ª gratis
                  </div>
                )}
                {!hasClient && bebidasTotal >= 5 && (
                  <div className="text-xs text-amber-600">
                    <Beer className="size-3 inline mr-1" />
                    Asigna un cliente para aplicar 5ª gratis ({bebidasTotal} bebidas)
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-amber-700">{formatEUR(total)}</span>
                </div>

                {pointsEarned > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <Star className="size-3 inline mr-1" />
                    Puntos a ganar: <span className="font-semibold text-amber-700">{pointsEarned}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant={selectedPaymentMethod === 'efectivo' ? 'default' : 'outline'}
                  className={`flex-1 h-12 ${selectedPaymentMethod === 'efectivo' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  onClick={() => setSelectedPaymentMethod('efectivo')}
                >
                  <Euro className="size-5 mr-2" />
                  Efectivo
                </Button>
                <Button
                  variant={selectedPaymentMethod === 'tarjeta' ? 'default' : 'outline'}
                  className={`flex-1 h-12 ${selectedPaymentMethod === 'tarjeta' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                  onClick={() => setSelectedPaymentMethod('tarjeta')}
                >
                  <CreditCard className="size-5 mr-2" />
                  Tarjeta
                </Button>
              </div>

              <Button
                className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCobrar}
                disabled={paying || selectedOrders.length === 0 || !cashSession}
              >
                <Euro className="size-6 mr-2" />
                {paying ? 'Cobrando...' : 'COBRAR'}
              </Button>

              {!cashSession && (
                <p className="text-sm text-red-600 text-center font-medium mt-1">
                  Abre caja para poder cobrar
                </p>
              )}

              {/* Print ticket / factura buttons */}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => {
                    if (selectedOrders.length > 0) {
                      handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'ticket')
                    }
                  }}
                >
                  <Printer className="size-4 mr-2" />
                  Imprimir Ticket
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => {
                    if (selectedOrders.length > 0) {
                      handlePrintTicket('receipt', selectedOrders[0].id, authHeaders, 'factura')
                    }
                  }}
                >
                  <FileText className="size-4 mr-2" />
                  Imprimir Factura
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── Tables Overview ────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Cash Session Section */}
      <Card className="rounded-xl border-2 border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          {!cashSession ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Lock className="size-5 text-red-600" />
                  Caja Cerrada
                </h3>
                <p className="text-sm text-muted-foreground">Debes abrir caja para poder cobrar</p>
              </div>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowOpenCashDialog(true)}
              >
                Abrir Caja
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CheckCircle className="size-5 text-green-600" />
                  Caja Abierta
                </h3>
                <p className="text-sm text-muted-foreground">
                  Apertura: {formatEUR(cashSession.openingCash)} ·
                  Iniciada: {formatTime(cashSession.openedAt)}
                  {cashSession.openedBy && ` · Por: ${cashSession.openedBy.name ?? cashSession.openedBy.username ?? 'Usuario eliminado'}`}
                  {!cashSession.openedBy && ' · Por: Usuario eliminado'}
                </p>
              </div>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setShowCloseCashDialog(true)}
              >
                Cerrar Caja
              </Button>
            </div>
          )}
          {cashCloseSummary && (
            <div className="mt-3 p-3 bg-white rounded-lg border text-sm space-y-1">
              <p className="font-bold text-base mb-1">Resumen de cierre</p>
              <div className="flex justify-between"><span>Ventas totales:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalSales ?? 0)}</span></div>
              <div className="flex justify-between"><span>Efectivo sistema:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCash ?? 0)}</span></div>
              <div className="flex justify-between"><span>Tarjeta sistema:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCard ?? 0)}</span></div>
              <div className="flex justify-between"><span>Proveedores:</span><span className="font-semibold text-orange-700">-{formatEUR(cashCloseSummary.totalSuppliers ?? 0)}</span></div>
              <Separator />
              <p className="font-semibold text-sm mt-1">Efectivo</p>
              <div className="flex justify-between"><span>Esperado (apertura + efectivo - proveedores):</span><span className="font-semibold">{formatEUR(cashCloseSummary.expectedCash ?? 0)}</span></div>
              <div className="flex justify-between"><span>Contado:</span><span className="font-semibold">{formatEUR(cashCloseSummary.closingCash ?? 0)}</span></div>
              <div className="flex justify-between"><span>Diferencia efectivo:</span>
                <span className={`font-bold ${(cashCloseSummary.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatEUR(cashCloseSummary.difference ?? 0)}
                </span>
              </div>
              <Separator />
              <p className="font-semibold text-sm mt-1">Tarjeta</p>
              <div className="flex justify-between"><span>Tarjeta sistema:</span><span className="font-semibold">{formatEUR(cashCloseSummary.totalCard ?? 0)}</span></div>
              <div className="flex justify-between"><span>Tarjeta contada:</span><span className="font-semibold">{formatEUR(cashCloseSummary.closingCard ?? 0)}</span></div>
              <div className="flex justify-between"><span>Diferencia tarjeta:</span>
                <span className={`font-bold ${(cashCloseSummary.cardDifference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatEUR(cashCloseSummary.cardDifference ?? 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base"><span className="font-bold">Diferencia total:</span>
                <span className={`font-bold ${(cashCloseSummary.totalDifference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatEUR(cashCloseSummary.totalDifference ?? 0)}
                </span>
              </div>
              {(cashCloseSummary.supplierPayments ?? []).length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-semibold mb-1">Pagos a proveedores:</p>
                  {(cashCloseSummary.supplierPayments ?? []).map((sp: { id: string; concept: string; amount: number; registeredBy: string }) => (
                    <div key={sp.id} className="flex justify-between text-xs">
                      <span>{sp.concept} ({sp.registeredBy})</span>
                      <span className="text-orange-700">-{formatEUR(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setCashCloseSummary(null)}>
                Cerrar resumen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Payments Section */}
      {cashSession && (
        <Card className="rounded-xl border-2 border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="size-5 text-orange-600" />
                <h3 className="font-bold text-lg">Pagos a Proveedores</h3>
                {supplierPayments.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {supplierPayments.length} pago{supplierPayments.length > 1 ? 's' : ''} · {formatEUR(supplierPayments.reduce((s, sp) => s + sp.amount, 0))}
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => setShowSupplierDialog(true)}
              >
                <Plus className="size-4 mr-1" />
                Añadir
              </Button>
            </div>
            {supplierPayments.length > 0 ? (
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {supplierPayments.map((sp) => (
                    <div key={sp.id} className="flex items-center justify-between text-sm bg-white rounded-lg p-2">
                      <div>
                        <span className="font-medium">{sp.concept}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {sp.user?.name || sp.user?.username || 'Usuario eliminado'} · {formatTime(sp.createdAt)}
                        </span>
                      </div>
                      <span className="font-bold text-orange-700">{formatEUR(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No hay pagos a proveedores registrados</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Open Cash Dialog */}
      <Dialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Efectivo de apertura (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenCashDialog(false)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={cashSessionLoading || !openingCashInput}
              onClick={async () => {
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
              }}
            >
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={showCloseCashDialog} onOpenChange={setShowCloseCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Efectivo contado (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closingCashInput}
                onChange={(e) => setClosingCashInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tarjeta contabilizada (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closingCardInput}
                onChange={(e) => setClosingCardInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseCashDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={cashSessionLoading || !closingCashInput}
              onClick={async () => {
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
              }}
            >
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Payment Dialog */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pago a Proveedor</DialogTitle>
            <DialogDescription>Registrar un pago a proveedor durante la sesión de caja actual</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                placeholder="Ej: bebidas, pan, hielo..."
                value={supplierConcept}
                onChange={(e) => setSupplierConcept(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={supplierAmount}
                onChange={(e) => setSupplierAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>Cancelar</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={addingSupplier || !supplierConcept.trim() || !supplierAmount}
              onClick={handleAddSupplier}
            >
              {addingSupplier ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Caja</h2>
        <Button variant="outline" size="sm" className="h-10" onClick={() => { fetchTables(); fetchActiveOrders() }}>
          <ShoppingCart className="size-4 mr-1" />
          Actualizar
        </Button>
      </div>

      {tablesByZone.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">No hay mesas configuradas.</p>
          </CardContent>
        </Card>
      ) : (
        tablesByZone.map(({ zone, config: cfg, tables: zoneTables }) => (
          <div key={zone}>
            <div className="flex items-center gap-2 mb-3">
              {cfg?.icon ?? <CircleDot className="size-4" />}
              <h3 className="font-semibold text-lg">{cfg?.label ?? zone}</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {zoneTables.map((table) => {
                const tableOrders = getTableOrders(table.id)
                const isAvailable = table.status === 'available'
                const isOccupied = table.status === 'occupied'
                const isReady = hasReadyOrders(table.id)
                const orderTotal = tableOrders.reduce((s, o) => s + (o.subtotal ?? o.total), 0)
                const itemCount = tableOrders.reduce((s, o) => s + o.items.length, 0)

                return (
                  <button
                    key={table.id}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[120px] ${
                      isReady
                        ? 'bg-amber-50 border-amber-400 hover:bg-amber-100 animate-pulse'
                        : isAvailable
                        ? 'bg-green-50 border-green-300 opacity-60'
                        : isOccupied
                        ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 hover:border-orange-500'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                    onClick={() => !isAvailable && setPayingTable(table.id)}
                    disabled={isAvailable}
                  >
                    {isReady && (
                      <div className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">
                        !
                      </div>
                    )}
                    <span className="text-3xl font-bold">{table.number}</span>
                    {isAvailable ? (
                      <span className="text-xs text-green-600 mt-1">Libre</span>
                    ) : (
                      <>
                        <span className="text-xs mt-1">
                          {isReady ? '🟢 ¡Listo!' : '🔴 Ocupada'}
                        </span>
                        {itemCount > 0 && (
                          <span className="text-xs font-semibold text-amber-800 mt-0.5">
                            {itemCount} items · {formatEUR(orderTotal)}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
