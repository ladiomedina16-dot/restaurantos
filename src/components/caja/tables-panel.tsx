'use client'

import { RefreshCw, Clock, Grid3x3, Users } from 'lucide-react'
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

      {/* Tables List — scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
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
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <span className="scale-75">{cfg?.icon}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                  const customerName = tableOrders[0]?.client?.name

                  return (
                    <button
                      key={table.id}
                      className={`w-full mb-1.5 p-3 rounded-lg border transition-all text-left active:scale-[0.98] ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                          : isReady
                          ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                          : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                      }`}
                      onClick={() => onSelectTable(table.id)}
                    >
                      {/* Row 1: Table number + Total */}
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>
                          Mesa {table.number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isReady && (
                            <Badge className="text-[8px] bg-emerald-100 text-emerald-700 border border-emerald-300 px-1.5 py-0 rounded-full">
                              LISTO
                            </Badge>
                          )}
                          <span className="text-sm font-bold text-emerald-600">
                            {formatEUR(orderTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Items count + Customer */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <ShoppingBagIcon className="size-3" />
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          {customerName && (
                            <>
                              <span className="text-gray-300 mx-0.5">·</span>
                              <Users className="size-3" />
                              {customerName}
                            </>
                          )}
                        </span>
                        {earliestOrder && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="size-3" />
                            {formatTime(earliestOrder.createdAt)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
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

/** Small inline icon for items count — avoids extra import */
function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
