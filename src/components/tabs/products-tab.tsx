'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { Product } from '@/types/restaurant'
import { formatEUR } from '@/lib/formatters'
import { clientHasPermission } from '@/lib/client-permissions'
import { categoryOrder } from '@/lib/constants'
import { categoryConfig } from '@/lib/config-ui'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Package,
  Filter,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ProductsTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authToken, currentUser, authHeaders, handleFetchResponse } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all') // all, active, inactive

  // Product form dialog state
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'general',
    stock: 0,
  })
  const [productFormLoading, setProductFormLoading] = useState(false)
  const [productFormError, setProductFormError] = useState('')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toggle active state
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const canCreate = currentUser ? clientHasPermission(currentUser.role, 'products:create') : false
  const canUpdate = currentUser ? clientHasPermission(currentUser.role, 'products:update') : false
  const canDelete = currentUser ? clientHasPermission(currentUser.role, 'products:delete') : false

  const fetchProducts = useCallback(async () => {
    if (!authToken) return
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (activeFilter === 'active') params.set('active', 'true')
      else if (activeFilter === 'inactive') params.set('active', 'false')

      const headers = authHeaders(false)
      // If overrideRestaurantId is provided (super_admin viewing a restaurant), use it
      if (overrideRestaurantId) {
        headers['X-Restaurant-Id'] = overrideRestaurantId
      }

      const res = await fetch(`/api/products?${params.toString()}`, { headers })
      if (!handleFetchResponse(res)) return
      const data = await res.json()
      setProducts(data.products || [])
    } catch {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [authToken, categoryFilter, activeFilter, authHeaders, handleFetchResponse, overrideRestaurantId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Filter by search text client-side
  const filtered = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
  })

  // Group by category for display
  const grouped = categoryFilter === 'all'
    ? categoryOrder.reduce<Record<string, Product[]>>((acc, cat) => {
        const items = filtered.filter((p) => p.category === cat)
        if (items.length > 0) acc[cat] = items
        return acc
      }, {})
    : { [categoryFilter]: filtered }

  const openCreateDialog = () => {
    setEditingProduct(null)
    setProductForm({ name: '', description: '', price: 0, category: 'bebida', stock: 50 })
    setProductFormError('')
    setShowProductDialog(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category,
      stock: product.stock,
    })
    setProductFormError('')
    setShowProductDialog(true)
  }

  const handleSaveProduct = async () => {
    setProductFormError('')
    if (!productForm.name.trim()) {
      setProductFormError('El nombre es obligatorio')
      return
    }
    if (productForm.price < 0) {
      setProductFormError('El precio no puede ser negativo')
      return
    }

    setProductFormLoading(true)
    try {
      // Build headers with correct restaurant scope
      const headers = authHeaders()
      if (overrideRestaurantId) {
        headers['X-Restaurant-Id'] = overrideRestaurantId
      }

      if (editingProduct) {
        // Update existing
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name: productForm.name,
            description: productForm.description,
            price: productForm.price,
            category: productForm.category,
            stock: productForm.stock,
          }),
        })
        if (!handleFetchResponse(res)) return
        if (res.ok) {
          toast.success('Producto actualizado')
          setShowProductDialog(false)
          fetchProducts()
        } else {
          const err = await res.json()
          setProductFormError(err.error || 'Error al actualizar producto')
        }
      } else {
        // Create new
        const res = await fetch('/api/products', {
          method: 'POST',
          headers,
          body: JSON.stringify(productForm),
        })
        if (!handleFetchResponse(res)) return
        if (res.ok) {
          toast.success('Producto creado')
          setShowProductDialog(false)
          fetchProducts()
        } else {
          const err = await res.json()
          setProductFormError(err.error || 'Error al crear producto')
        }
      }
    } catch {
      setProductFormError('Error de red')
    } finally {
      setProductFormLoading(false)
    }
  }

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ active: !product.active }),
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        toast.success(product.active ? 'Producto desactivado' : 'Producto activado')
        fetchProducts()
      } else {
        toast.error('Error al cambiar estado')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/products/${deleteTarget.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        toast.success('Producto eliminado')
        setDeleteTarget(null)
        fetchProducts()
      } else {
        toast.error('Error al eliminar producto')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="size-5 text-amber-600" />
            Productos
          </h2>
          <p className="text-sm text-muted-foreground">
            {products.length} producto{products.length !== 1 ? 's' : ''} en la carta
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreateDialog} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Plus className="size-4" />
            Crear producto
          </Button>
        )}
      </div>

      {/* Search + Active Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Inactivos' },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={activeFilter === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={activeFilter === opt.value ? 'bg-amber-600 hover:bg-amber-700 text-white h-8' : 'h-8'}
              onClick={() => { setActiveFilter(opt.value); setLoading(true) }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className={categoryFilter === 'all' ? 'bg-amber-600 hover:bg-amber-700 text-white rounded-full h-8' : 'rounded-full h-8'}
          onClick={() => { setCategoryFilter('all'); setLoading(true) }}
        >
          <Filter className="size-3.5 mr-1" />
          Todos
        </Button>
        {categoryOrder.map((cat) => {
          const cfg = categoryConfig[cat]
          if (!cfg) return null
          const count = products.filter((p) => p.category === cat).length
          if (count === 0) return null
          return (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              className={categoryFilter === cat ? 'bg-amber-600 hover:bg-amber-700 text-white rounded-full h-8' : 'rounded-full h-8'}
              onClick={() => { setCategoryFilter(cat); setLoading(true) }}
            >
              {cfg.icon}
              <span className="ml-1">{cfg.label}</span>
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {count}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Product List */}
      {filtered.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center text-muted-foreground">
            <Package className="size-12 mb-3 opacity-30" />
            <p className="font-semibold">No hay productos</p>
            <p className="text-sm">
              {search ? 'No se encontraron productos con esa búsqueda' : 'Crea el primer producto para empezar'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => {
            const cfg = categoryConfig[cat] || { label: cat, icon: <Package className="size-4" /> }
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                    {cfg.icon}
                    {cfg.label}
                  </div>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  <Separator className="flex-1" />
                </div>

                {/* Desktop: Table view */}
                <div className="hidden md:block rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[250px]">Producto</TableHead>
                        <TableHead className="w-[80px] text-right">Precio</TableHead>
                        <TableHead className="w-[80px] text-center">Stock</TableHead>
                        <TableHead className="w-[90px] text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((p) => (
                        <TableRow key={p.id} className={!p.active ? 'opacity-50' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              {p.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[220px]">{p.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatEUR(p.price)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={p.stock > 10 ? 'secondary' : p.stock > 0 ? 'outline' : 'destructive'} className="text-xs">
                              {p.stock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {p.active ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Activo</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleToggleActive(p)}
                                  disabled={togglingId === p.id}
                                  title={p.active ? 'Desactivar' : 'Activar'}
                                >
                                  {togglingId === p.id ? (
                                    <span className="size-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                                  ) : p.active ? (
                                    <Eye className="size-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="size-4 text-muted-foreground" />
                                  )}
                                </Button>
                              )}
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditDialog(p)}
                                  title="Editar"
                                >
                                  <Pencil className="size-4 text-amber-600" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setDeleteTarget(p)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="size-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: Card view */}
                <div className="md:hidden space-y-2">
                  {items.map((p) => (
                    <Card key={p.id} className={!p.active ? 'opacity-50' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-amber-700">{formatEUR(p.price)}</p>
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                              <Badge variant={p.stock > 10 ? 'secondary' : p.stock > 0 ? 'outline' : 'destructive'} className="text-xs px-1.5">
                                Stock: {p.stock}
                              </Badge>
                              {p.active ? (
                                <Badge className="bg-green-100 text-green-800 text-xs px-1.5">Activo</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-1.5">Inactivo</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {(canUpdate || canDelete) && (
                          <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t">
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleToggleActive(p)}
                                disabled={togglingId === p.id}
                                title={p.active ? 'Desactivar' : 'Activar'}
                              >
                                {p.active ? <Eye className="size-3.5 text-green-600" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                              </Button>
                            )}
                            {canUpdate && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(p)} title="Editar">
                                <Pencil className="size-3.5 text-amber-600" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(p)} title="Eliminar">
                                <Trash2 className="size-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingProduct ? (
                <><Pencil className="size-5 text-amber-600" /> Editar producto</>
              ) : (
                <><Plus className="size-5 text-amber-600" /> Crear producto</>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los datos del producto' : 'Añade un nuevo producto a la carta'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Nombre del producto"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción del producto"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio (€) *</Label>
                <Input
                  type="number"
                  step="0.10"
                  min="0"
                  placeholder="0.00"
                  value={productForm.price || ''}
                  onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOrder.map((cat) => {
                    const cfg = categoryConfig[cat]
                    return (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-2">
                          {cfg?.icon}
                          {cfg?.label || cat}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {productFormError && (
              <p className="text-sm text-red-600 text-center">{productFormError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={productFormLoading || !productForm.name.trim()}
              onClick={handleSaveProduct}
            >
              {productFormLoading ? 'Guardando...' : editingProduct ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se desactivará <strong>{deleteTarget?.name}</strong>. El producto quedará inactivo pero no se borrará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteLoading}
              onClick={handleDeleteProduct}
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
