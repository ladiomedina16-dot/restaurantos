'use client'

import { RefreshCw, Clock, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { formatEUR, formatTime } from '@/lib/formatters'
import { zoneOrder, orderStatusConfig } from '@/lib/constants'
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
  // Only show occupied tables
  const occupiedTables = tables.filter((t) => t.status === 'occupied')

  // Group by zone
  const tablesByZone = zoneOrder
    .map((z) => ({
      zone: z,
      config: zoneConfig[z],
      tables: occupiedTables.filter((t) => t.zone === z),
    }))
    .filter((g) => g.tables.length > 0)

  return (
    <div className="h-full flex flex-col bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Mesas Ocupadas
          </h3>
          <Badge variant="outline" className="text-xs bg-amber-900/30 text-amber-300 border-amber-700/40">
            {occupiedTables.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-slate-400 hover:text-amber-400 hover:bg-slate-800"
          onClick={onRefresh}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Tables List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {tablesByZone.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <ShoppingBag className="size-10 mb-2 opacity-40" />
              <p className="text-sm">No hay mesas ocupadas</p>
            </div>
          ) : (
            tablesByZone.map(({ zone, config: cfg, tables: zoneTables }) => (
              <div key={zone}>
                {/* Zone header */}
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  <span className="text-slate-500">{cfg?.icon}</span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {cfg?.label ?? zone}
                  </span>
                </div>

                {/* Table cards */}
                {zoneTables.map((table) => {
                  const tableOrders = getTableOrders(table.id)
                  const isReady = hasReadyOrders(table.id)
                  const orderTotal = tableOrders.reduce((s, o) => s + (o.subtotal ?? o.total), 0)
                  const itemCount = tableOrders.reduce((s, o) => s + o.items.length, 0)
                  const isSelected = selectedTableId === table.id
                  const earliestOrder = tableOrders.sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  )[0]

                  return (
                    <button
                      key={table.id}
                      className={`w-full mb-1.5 p-3 rounded-xl border-2 transition-all text-left active:scale-[0.98] ${
                        isSelected
                          ? 'bg-amber-900/40 border-amber-500 shadow-lg shadow-amber-500/10'
                          : isReady
                          ? 'bg-emerald-900/20 border-emerald-600/40 hover:border-emerald-500/60 hover:bg-emerald-900/30 animate-pulse'
                          : 'bg-slate-800/60 border-slate-600/30 hover:border-amber-500/30 hover:bg-slate-800/80'
                      }`}
                      onClick={() => onSelectTable(table.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xl font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                          M{table.number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isReady && (
                            <Badge className="text-[10px] bg-emerald-600/30 text-emerald-300 border-emerald-500/30 border px-1.5 py-0">
                              LISTO
                            </Badge>
                          )}
                          {tableOrders.length > 1 && (
                            <Badge variant="outline" className="text-[10px] bg-slate-700/40 text-slate-300 border-slate-600/30 px-1.5 py-0">
                              {tableOrders.length} pedidos
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="size-3" />
                            {itemCount} items
                          </span>
                          {earliestOrder && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatTime(earliestOrder.createdAt)}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-amber-400">
                          {formatEUR(orderTotal)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
