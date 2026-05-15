'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import { formatEUR } from '@/lib/formatters'
import { toast } from 'sonner'
import {
  BarChart3,
  Euro,
  CreditCard,
  Star,
  XCircle,
  Receipt,
  Users,
  Beer,
  ChefHat,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

export function ReportesTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [reportType, setReportType] = useState<'daily_sales' | 'payment_methods' | 'top_products' | 'cancelled_orders' | 'cash_closes' | 'sales_by_user' | 'bar_orders' | 'kitchen_orders' | 'supplier_payments'>('daily_sales')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: reportType })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/reports?${params.toString()}`, { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setReportData(json)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [reportType, dateFrom, dateTo, authHeaders, handleFetchResponse])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const reportTypes = [
    { value: 'daily_sales' as const, label: 'Ventas del día' },
    { value: 'payment_methods' as const, label: 'Por método de pago' },
    { value: 'top_products' as const, label: 'Productos más vendidos' },
    { value: 'cancelled_orders' as const, label: 'Pedidos cancelados' },
    { value: 'cash_closes' as const, label: 'Cierres de caja' },
    { value: 'sales_by_user' as const, label: 'Ventas por camarero' },
    { value: 'bar_orders' as const, label: 'Comandas barra' },
    { value: 'kitchen_orders' as const, label: 'Comandas cocina' },
    { value: 'supplier_payments' as const, label: 'Pagos proveedores' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
        <Button variant="outline" size="sm" className="h-10" onClick={fetchReport} disabled={loading}>
          <BarChart3 className="size-4 mr-1" />
          {loading ? 'Cargando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {reportTypes.map((rt) => (
              <Button
                key={rt.value}
                variant={reportType === rt.value ? 'default' : 'outline'}
                size="sm"
                className={reportType === rt.value ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={() => { setReportType(rt.value); setReportData(null) }}
              >
                {rt.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : !reportData ? (
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">Selecciona un reporte y haz clic en Actualizar</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Daily Sales */}
          {reportType === 'daily_sales' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5" />
                  Ventas del día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ingresos</p>
                    <p className="text-2xl font-bold text-amber-700">{formatEUR(reportData.report?.totalRevenue ?? reportData.totalRevenue ?? 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                    <p className="text-2xl font-bold text-amber-700">{reportData.report?.totalOrders ?? reportData.totalOrders ?? 0}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ticket medio</p>
                    <p className="text-2xl font-bold text-amber-700">{formatEUR(reportData.report?.avgTicket ?? reportData.avgTicket ?? 0)}</p>
                  </div>
                </div>
                {(reportData.report?.days ?? reportData.days)?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-right p-2">Ingresos</th>
                          <th className="text-right p-2">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody>
                      {(reportData.report?.days ?? reportData.days ?? []).map((d: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{d.date}</td>
                            <td className="text-right p-2 font-semibold">{formatEUR(d.revenue)}</td>
                            <td className="text-right p-2">{d.orders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Methods */}
          {reportType === 'payment_methods' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <Euro className="size-10 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground">Efectivo</p>
                  <p className="text-3xl font-bold text-green-700">{formatEUR(reportData.report?.efectivo?.total ?? 0)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{reportData.report?.efectivo?.count ?? 0} pagos</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <CreditCard className="size-10 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Tarjeta</p>
                  <p className="text-3xl font-bold text-blue-700">{formatEUR(reportData.report?.tarjeta?.total ?? 0)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{reportData.report?.tarjeta?.count ?? 0} pagos</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Products */}
          {reportType === 'top_products' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="size-5" />
                  Productos más vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(Array.isArray(reportData.report) ? reportData.report : reportData.report?.products ?? reportData.products)?.length > 0 ? (
                  <div className="space-y-2">
                    {(Array.isArray(reportData.report) ? reportData.report : reportData.report?.products ?? reportData.products ?? []).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.quantity} unidades</p>
                          </div>
                        </div>
                        <span className="font-bold text-amber-700">{formatEUR(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay datos</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancelled Orders */}
          {reportType === 'cancelled_orders' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="size-5 text-red-500" />
                  Pedidos cancelados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Ingresos perdidos</p>
                  <p className="text-2xl font-bold text-red-700">{formatEUR(reportData.report?.totalLost ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">{reportData.report?.totalCancelled ?? reportData.report?.orders?.length ?? 0} pedidos</p>
                </div>
                {reportData.report?.orders && reportData.report.orders.length > 0 ? (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {reportData.report.orders.map((o: any) => (
                        <div key={o.id} className="border rounded-lg p-3">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold">Mesa {o.table?.number ?? '?'}</span>
                            <span className="font-bold text-red-600">{formatEUR(o.total)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('es-ES')}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay pedidos cancelados</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cash Closes */}
          {reportType === 'cash_closes' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="size-5" />
                  Cierres de caja
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.report && reportData.report.length > 0 ? (
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-4">
                      {reportData.report.map((s: any) => (
                        <div key={s.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="font-semibold">{s.openedAt ? new Date(s.openedAt).toLocaleString('es-ES') : '-'}</span>
                              <span className="text-muted-foreground ml-2">→ {s.closedAt ? new Date(s.closedAt).toLocaleString('es-ES') : '-'}</span>
                            </div>
                            <span className={`font-bold text-lg ${(s.totalDifference ?? s.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Dif total: {s.totalDifference != null ? formatEUR(s.totalDifference) : s.difference != null ? formatEUR(s.difference) : '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-2">
                            <div className="bg-green-50 rounded p-2 text-center">
                              <p className="text-xs text-muted-foreground">Efectivo</p>
                              <p className="font-bold text-green-700">{formatEUR(s.totalCash ?? 0)}</p>
                            </div>
                            <div className="bg-blue-50 rounded p-2 text-center">
                              <p className="text-xs text-muted-foreground">Tarjeta</p>
                              <p className="font-bold text-blue-700">{formatEUR(s.totalCard ?? 0)}</p>
                            </div>
                            <div className="bg-amber-50 rounded p-2 text-center">
                              <p className="text-xs text-muted-foreground">Ventas</p>
                              <p className="font-bold text-amber-700">{formatEUR(s.totalSales ?? 0)}</p>
                            </div>
                            <div className="bg-orange-50 rounded p-2 text-center">
                              <p className="text-xs text-muted-foreground">Proveedores</p>
                              <p className="font-bold text-orange-700">-{formatEUR(s.totalSuppliers ?? 0)}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-2">
                            <div className="text-center">
                              <span className="text-muted-foreground">Apertura: </span>
                              <span className="font-semibold">{formatEUR(s.openingCash ?? 0)}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">Efectivo esperado: </span>
                              <span className="font-semibold">{formatEUR(s.expectedCash ?? 0)}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">Efectivo contado: </span>
                              <span className="font-semibold">{formatEUR(s.closingCash ?? 0)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-2">
                            <div className="text-center">
                              <span className="text-muted-foreground">Dif efectivo: </span>
                              <span className={`font-semibold ${(s.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {s.difference != null ? formatEUR(s.difference) : '-'}
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">Tarjeta contada: </span>
                              <span className="font-semibold">{formatEUR(s.closingCard ?? 0)}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">Dif tarjeta: </span>
                              <span className={`font-semibold ${(s.cardDifference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {s.cardDifference != null ? formatEUR(s.cardDifference) : '-'}
                              </span>
                            </div>
                          </div>
                          {s.supplierPayments && s.supplierPayments.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs font-semibold mb-1">Pagos a proveedores:</p>
                              {s.supplierPayments.map((sp: any) => (
                                <div key={sp.id} className="flex justify-between text-xs">
                                  <span>{sp.concept} ({sp.registeredBy})</span>
                                  <span className="text-orange-700 font-semibold">-{formatEUR(sp.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay cierres de caja</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sales by User */}
          {reportType === 'sales_by_user' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Ventas por camarero
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(Array.isArray(reportData.report) ? reportData.report : reportData.report ?? reportData.users)?.length > 0 ? (
                  <div className="space-y-2">
                    {(Array.isArray(reportData.report) ? reportData.report : reportData.report ?? reportData.users ?? []).map((u: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold">{u.userName}</p>
                            <p className="text-xs text-muted-foreground">{u.totalOrders} pedidos</p>
                          </div>
                        </div>
                        <span className="font-bold text-amber-700">{formatEUR(u.totalRevenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay datos</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bar Orders */}
          {reportType === 'bar_orders' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <Beer className="size-10 mx-auto mb-2 text-amber-600" />
                  <p className="text-sm text-muted-foreground">Bebidas servidas</p>
                  <p className="text-3xl font-bold text-amber-700">{reportData.report?.totalItems ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <Euro className="size-10 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground">Ingresos barra</p>
                  <p className="text-3xl font-bold text-green-700">{formatEUR(reportData.report?.totalRevenue ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <Receipt className="size-10 mx-auto mb-2 text-amber-600" />
                  <p className="text-sm text-muted-foreground">Comandas</p>
                  <p className="text-3xl font-bold text-amber-700">{reportData.report?.orders ?? 0}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Kitchen Orders */}
          {reportType === 'kitchen_orders' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <ChefHat className="size-10 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Platos servidos</p>
                  <p className="text-3xl font-bold text-orange-700">{reportData.report?.totalItems ?? reportData.totalItems ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <Euro className="size-10 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground">Ingresos cocina</p>
                  <p className="text-3xl font-bold text-green-700">{formatEUR(reportData.report?.totalRevenue ?? reportData.totalRevenue ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-6 text-center">
                  <Receipt className="size-10 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Comandas</p>
                  <p className="text-3xl font-bold text-orange-700">{reportData.report?.orders ?? reportData.orders ?? 0}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Supplier Payments */}
          {reportType === 'supplier_payments' && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="size-5 text-orange-600" />
                  Pagos a Proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total pagado</p>
                    <p className="text-2xl font-bold text-orange-700">{formatEUR(reportData.report?.totalAmount ?? 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Nº pagos</p>
                    <p className="text-2xl font-bold text-orange-700">{reportData.report?.count ?? 0}</p>
                  </div>
                </div>
                {reportData.report?.payments && reportData.report.payments.length > 0 ? (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {reportData.report.payments.map((sp: any) => (
                        <div key={sp.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{sp.concept}</p>
                            <p className="text-xs text-muted-foreground">
                              {sp.registeredBy} · {new Date(sp.createdAt).toLocaleString('es-ES')}
                            </p>
                          </div>
                          <span className="font-bold text-orange-700 text-lg">{formatEUR(sp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay pagos a proveedores</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
