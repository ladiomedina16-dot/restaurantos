'use client'

import { CheckCircle, Lock, ShoppingBag, Receipt, TrendingUp, HandCoins } from 'lucide-react'
import { formatEUR } from '@/lib/formatters'

interface CashDashboardProps {
  cashSession: any
  occupiedTablesCount: number
  activeOrdersCount: number
  totalPending: number
}

export function CashDashboard({
  cashSession,
  occupiedTablesCount,
  activeOrdersCount,
  totalPending,
}: CashDashboardProps) {
  return (
    <div className="h-full flex flex-col bg-white border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 shrink-0">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Resumen de Caja</h3>
      </div>

      {/* Dashboard content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {/* Cash session status */}
        <div
          className={`flex items-center gap-3 px-6 py-3 rounded-xl ${
            cashSession
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {cashSession ? (
            <>
              <CheckCircle className="size-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-700">Caja Abierta</p>
                <p className="text-xs text-emerald-500">Sesión activa</p>
              </div>
            </>
          ) : (
            <>
              <Lock className="size-6 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">Caja Cerrada</p>
                <p className="text-xs text-red-400">Abre caja para operar</p>
              </div>
            </>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
            <ShoppingBag className="size-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-800">{occupiedTablesCount}</p>
            <p className="text-xs text-gray-500 font-medium">Mesas Ocupadas</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
            <Receipt className="size-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-800">{activeOrdersCount}</p>
            <p className="text-xs text-gray-500 font-medium">Pedidos Activos</p>
          </div>
          <div className="col-span-2 bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
            <TrendingUp className="size-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-emerald-600">{formatEUR(totalPending)}</p>
            <p className="text-xs text-emerald-600 font-medium">Total Pendiente</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <HandCoins className="size-5" />
            <p className="text-sm font-medium">Selecciona una mesa para cobrar</p>
          </div>
          <p className="text-xs text-gray-300">
            Haz clic en una mesa ocupada del panel izquierdo
          </p>
        </div>
      </div>
    </div>
  )
}
