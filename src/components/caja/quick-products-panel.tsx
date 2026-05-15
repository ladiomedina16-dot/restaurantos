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

  // Filter products
  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !selectedCategory || p.category === selectedCategory
    return matchSearch && matchCategory
  })

  // Group by category
  const groupedByCategory = categoryOrder
    .map((cat) => ({
      category: cat,
      config: categoryConfig[cat],
      products: filtered.filter((p) => p.category === cat),
    }))
    .filter((g) => g.products.length > 0)

  // Available categories from products
  const availableCategories = categoryOrder.filter((cat) =>
    products.some((p) => p.category === cat)
  )

  return (
    <div className="h-full flex flex-col bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-700/40">
        <div className="flex items-center gap-2 mb-2">
          <Package className="size-4 text-amber-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Productos</h3>
          <Badge variant="outline" className="text-[10px] bg-slate-800/40 text-slate-400 border-slate-600/30 ml-auto">
            {products.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs bg-slate-800/50 border-slate-600/30 text-white placeholder:text-slate-500"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              onClick={() => setSearch('')}
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-none">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] rounded-md shrink-0 ${
              !selectedCategory
                ? 'bg-amber-900/30 text-amber-300 border border-amber-600/30'
                : 'bg-slate-800/40 text-slate-400 border border-slate-700/30'
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {availableCategories.map((cat) => {
            const cfg = categoryConfig[cat]
            return (
              <Button
                key={cat}
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-[10px] rounded-md shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-amber-900/30 text-amber-300 border border-amber-600/30'
                    : 'bg-slate-800/40 text-slate-400 border border-slate-700/30'
                }`}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                {cfg?.label ?? cat}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {groupedByCategory.map(({ category, config: cfg, products: catProducts }) => (
            <div key={category}>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1 mb-1 flex items-center gap-1">
                {cfg?.icon}
                {cfg?.label ?? category}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {catProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-amber-600/40 hover:bg-slate-800/70 transition-colors cursor-default"
                  >
                    <p className="text-xs font-medium text-slate-200 truncate">{product.name}</p>
                    <p className="text-xs font-bold text-amber-400 mt-0.5">{formatEUR(product.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Package className="size-8 mb-2 opacity-40" />
              <p className="text-xs">No hay productos</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
