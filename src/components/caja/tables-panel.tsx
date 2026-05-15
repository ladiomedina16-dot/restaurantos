'use client'

import { RefreshCw, Clock, Grid3x3, Users, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { formatEUR, formatTime } from '@/lib/formatters'
import { zoneOrder } from '@/lib/constants'
import { zoneConfig } from '@/lib/config-ui'
import type { TableItem, Order } from '@/types/restaurant'

interface TablesPanelProps {
  tables: TableItem[]
  orders: Order[]
  selectedTableId: string | null
  onSelectTable: (tableId: string) => void
  onRefresh: () => void
  getTableOrders: (tableId: string) => Order[]
  hasReadyOrders: (tableId: string) => boolean
  now: number
}

export function TablesPanel({
  tables,
  orders,
  selectedTableId,
  onSelectTable,
  onRefresh,
  getTableOrders,
  hasReadyOrders,
  now,
}: TablesPanelProps) {
  const occupiedTables = tables.filter((t) => t.status === 'occupied')

  const tablesByZone = zoneOrder
    .map((z) => ({
      zone: z,
      config: zoneConfig[z],
      tables: occupiedTables.filter((t) => t.zone === z),
    }))
    .filter((g) => g.tables.length > 0)

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Grid3x3 className="size-4 text-gray-600" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Mesas Ocupadas
          </h3>
          <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-600 border-gray-200 px-1.5 py-0">
            {occupiedTables.length}
          </Badge>
        </div>
      </div>

      {/* Tables Grid — 2 columns, scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {tablesByZone.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Grid3x3 className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-400">Sin mesas ocupadas</p>
              <p className="text-xs text-gray-300 mt-1">Las mesas activas aparecerán aquí</p>
            </div>
          ) : (
            tablesByZone.map(({ zone, config: cfg, tables: zoneTables }) => (
              <div key={zone}>
                {/* Zone header */}
                <div className="flex items-center gap-1.5 px-0.5 mb-2">
                  <span className="scale-75">{cfg?.icon}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {cfg?.label ?? zone}
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-gray-50 text-gray-400 border-gray-200 px-1 py-0 ml-1">
                    {zoneTables.length}
                  </Badge>
                </div>

                {/* 2-column card grid */}
                <div className="grid grid-cols-2 gap-2">
                  {zoneTables.map((table) => {
                    const tableOrders = getTableOrders(table.id)
                    const isReady = hasReadyOrders(table.id)
                    const orderTotal = tableOrders.reduce((s, o) => s + (o.subtotal ?? o.total), 0)
                    const itemCount = tableOrders.reduce((s, o) => s + o.items.length, 0)
                    const isSelected = selectedTableId === table.id
                    const earliestOrder = [...tableOrders].sort(
                      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    )[0]
                    const customerName = tableOrders[0]?.client?.name

                    return (
                      <button
                        key={table.id}
                        className={`w-full p-3 rounded-xl border-2 transition-all text-left active:scale-[0.97] min-h-[100px] flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 shadow-md shadow-emerald-100'
                            : isReady
                            ? 'bg-emerald-50/30 border-emerald-300 hover:border-emerald-400 hover:shadow-sm'
                            : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50 hover:shadow-sm'
                        }`}
                        onClick={() => onSelectTable(table.id)}
                      >
                        {/* Top row: Mesa number + Ready badge */}
                        <div className="flex items-start justify-between gap-1">
                          <span className={`text-base font-extrabold leading-tight ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>
                            Mesa {table.number}
                          </span>
                          {isReady && (
                            <Badge className="text-[8px] bg-emerald-500 text-white border-0 px-1.5 py-0 rounded-full shrink-0 animate-pulse">
                              LISTO
                            </Badge>
                          )}
                        </div>

                        {/* Total — large and prominent */}
                        <div className="mt-1">
                          <span className="text-lg font-black text-emerald-600 leading-tight">
                            {formatEUR(orderTotal)}
                          </span>
                        </div>

                        {/* Bottom row: Items + Customer + Time */}
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate">
                            <ShoppingBag className="size-2.5 shrink-0" />
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            {customerName && (
                              <>
                                <span className="text-gray-300 mx-0.5">·</span>
                                <Users className="size-2.5 shrink-0" />
                                <span className="truncate">{customerName}</span>
                              </>
                            )}
                          </span>
                          {earliestOrder && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5 shrink-0 ml-1">
                              <Clock className="size-2.5" />
                              {formatTime(earliestOrder.createdAt)}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Bottom: Refresh button */}
      <div className="px-3 py-2 border-t border-gray-200 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 gap-1.5 text-xs font-semibold"
          onClick={onRefresh}
        >
          <RefreshCw className="size-3.5" />
          Actualizar
        </Button>
      </div>
    </div>
  )
}
