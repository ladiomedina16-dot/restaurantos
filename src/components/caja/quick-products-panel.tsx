'use client'

import { useState, useEffect } from 'react'
import { Package, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { categoryConfig } from '@/lib/config-ui'
import { categoryOrder } from '@/lib/constants'
import { formatEUR } from '@/lib/formatters'
import type { Product } from '@/types/restaurant'

interface QuickProductsPanelProps {
  authHeaders: (contentType?: boolean) => Record<string, string>
  handleFetchResponse: (res: Response) => boolean
}

export function QuickProductsPanel({ authHeaders, handleFetchResponse }: QuickProductsPanelProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/products', { headers: authHeaders(false) })
        if (!cancelled && handleFetchResponse(res) && res.ok) {
          const json = await res.json()
          if (!cancelled) {
            setProducts(json.products.filter((p: Product) => p.active))
          }
        }
      } catch { /* silently fail */ }
    }
    load()
    return () => { cancelled = true }
  }, [authHeaders, handleFetchResponse])

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !selectedCategory || p.category === selectedCategory
    return matchSearch && matchCategory
  })

  const groupedByCategory = categoryOrder
    .map((cat) => ({
      category: cat,
      config: categoryConfig[cat],
      products: filtered.filter((p) => p.category === cat),
    }))
    .filter((g) => g.products.length > 0)

  const availableCategories = categoryOrder.filter((cat) =>
    products.some((p) => p.category === cat)
  )

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1.5">
          <Package className="size-4 text-gray-500" />
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Productos Rápidos</h3>
          <Badge variant="outline" className="text-[9px] bg-gray-50 text-gray-500 border-gray-200 ml-auto px-1.5 py-0">
            {products.length}
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus-visible:ring-emerald-200"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setSearch('')}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-3 py-2 border-b border-gray-200 shrink-0">
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            className={`h-6 px-2.5 text-[10px] font-medium rounded-full shrink-0 border transition-colors ${
              !selectedCategory
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </button>
          {availableCategories.map((cat) => {
            const cfg = categoryConfig[cat]
            return (
              <button
                key={cat}
                className={`h-6 px-2.5 text-[10px] font-medium rounded-full shrink-0 border transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                {cfg?.label ?? cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Products Grid — scrollable, 4 cols */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {groupedByCategory.map(({ category, config: cfg, products: catProducts }) => (
            <div key={category}>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-0.5 mb-1.5 flex items-center gap-1">
                <span className="text-gray-400">{cfg?.icon}</span>
                {cfg?.label ?? category}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {catProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-2 rounded-md bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-default"
                  >
                    <p className="text-xs text-gray-800 truncate leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-bold text-emerald-600">{formatEUR(product.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Package className="size-8 mb-2 opacity-30" />
              <p className="text-xs text-gray-400">Sin productos</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
