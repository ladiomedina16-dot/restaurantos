'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  Receipt,
  Users,
  Plus,
  ArrowLeft,
  Building2,
  Flame,
  Phone,
  Shield,
  ShieldOff,
  Eye,
  Trash2,
  UserCircle,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { useAuth } from '@/components/common/auth-context'
import { toast } from 'sonner'
import type { RestaurantItem } from '@/types/restaurant'
import { DashboardTab } from '@/components/tabs/dashboard-tab'
import { UsersTab } from '@/components/tabs/users-tab'
import { TablesTab } from '@/components/tabs/tables-tab'
import { ProductsTab } from '@/components/tabs/products-tab'
import { OrdersTab } from '@/components/tabs/orders-tab'
import { ClientsTab } from '@/components/tabs/clients-tab'

// ─── SUPER ADMIN PANEL ──────────────────────────────────────────────────

export function SuperAdminPanel() {
  const { authToken, currentUser, authHeaders, handleFetchResponse } = useAuth()
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState({ name: '', slug: '', address: '', phone: '', adminUsername: '', adminPassword: '', adminName: '' })
  const [onboardingError, setOnboardingError] = useState('')
  const [viewRestaurantId, setViewRestaurantId] = useState<string | null>(null)
  const [blockLoading, setBlockLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RestaurantItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchRestaurants = useCallback(async () => {
    if (!authToken) return
    try {
      const res = await fetch('/api/restaurants', { headers: { Authorization: `Bearer ${authToken}` } })
      if (!handleFetchResponse(res)) return
      const data = await res.json()
      setRestaurants(data.restaurants || [])
    } catch {
      toast.error('Error al cargar restaurantes')
    } finally {
      setLoading(false)
    }
  }, [authToken, handleFetchResponse])

  useEffect(() => {
    fetchRestaurants()
  }, [fetchRestaurants])

  const handleOnboarding = async () => {
    setOnboardingError('')
    const payload = {
      restaurantName: onboardingForm.name,
      slug: onboardingForm.slug,
      address: onboardingForm.address,
      phone: onboardingForm.phone,
      adminUsername: onboardingForm.adminUsername,
      adminPassword: onboardingForm.adminPassword,
      adminName: onboardingForm.adminName,
    }
    console.log('[ONBOARDING] Payload:', JSON.stringify(payload, null, 2))

    setOnboardingLoading(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Restaurante y admin creados correctamente')
        setShowOnboardingDialog(false)
        setOnboardingForm({ name: '', slug: '', address: '', phone: '', adminUsername: '', adminPassword: '', adminName: '' })
        // Refresh restaurant list
        setLoading(true)
        fetchRestaurants()
      } else {
        const err = await res.json()
        setOnboardingError(err.error || 'Error al crear restaurante')
      }
    } catch {
      setOnboardingError('Error de red')
    } finally {
      setOnboardingLoading(false)
    }
  }

  const handleToggleBlock = async (restaurant: RestaurantItem) => {
    setBlockLoading(restaurant.id)
    try {
      const newStatus = restaurant.subscriptionStatus === 'suspended' ? 'trial' : 'suspended'
      const res = await fetch('/api/restaurants', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: restaurant.id, subscriptionStatus: newStatus }),
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        toast.success(newStatus === 'suspended' ? 'Restaurante bloqueado' : 'Restaurante desbloqueado')
        fetchRestaurants()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al cambiar estado')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setBlockLoading(null)
    }
  }

  const handleDeleteRestaurant = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/restaurants/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!handleFetchResponse(res)) return
      if (res.ok) {
        const json = await res.json()
        toast.success(json.message || 'Restaurante eliminado')
        setDeleteTarget(null)
        setLoading(true)
        fetchRestaurants()
      } else {
        // Always show real backend error — never hide it
        let errorMsg = 'Error al eliminar restaurante'
        try {
          const err = await res.json()
          // Backend returns: { success, code, message, meta } or { error }
          errorMsg = err.message || err.error || err.details || errorMsg
          // Append Prisma code if available for easier debugging
          if (err.code && err.code !== 'UNKNOWN') {
            errorMsg += ` (${err.code})`
          }
        } catch { /* response body not JSON */ }
        toast.error(errorMsg)
      }
    } catch (error) {
      // Show real error, not generic "Error de red"
      const message = error instanceof Error ? error.message : 'Error de conexión'
      toast.error(message)
    } finally {
      setDeleteLoading(false)
    }
  }

  // "Ver restaurante" — enter that restaurant's context with full admin tabs
  const [saActiveTab, setSaActiveTab] = useState<string>('dashboard')
  const viewedRestaurant = restaurants.find((r) => r.id === viewRestaurantId)

  if (viewRestaurantId) {
    const saTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
      { id: 'users', label: 'Usuarios', icon: <Users className="size-4" /> },
      { id: 'tables', label: 'Mesas', icon: <UtensilsCrossed className="size-4" /> },
      { id: 'products', label: 'Productos', icon: <Package className="size-4" /> },
      { id: 'orders', label: 'Pedidos', icon: <Receipt className="size-4" /> },
      { id: 'clients', label: 'Clientes', icon: <UserCircle className="size-4" /> },
    ]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setViewRestaurantId(null)} className="gap-1">
              <ArrowLeft className="size-4" />
              Volver a Restaurantes
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-amber-600" />
            <span className="font-bold text-lg">{viewedRestaurant?.name ?? 'Restaurante'}</span>
          </div>
        </div>
        <Tabs value={saActiveTab} onValueChange={setSaActiveTab}>
          <TabsList className="h-10 bg-muted p-1">
            {saTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-8 data-[state=active]:bg-background gap-1 text-xs font-medium px-3"
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <DashboardTab key={`dashboard-${viewRestaurantId}`} overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersTab key={`users-${viewRestaurantId}`} overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="tables" className="mt-4">
            <TablesTab key={`tables-${viewRestaurantId}`} overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <ProductsTab key={`products-${viewRestaurantId}`} overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="orders" className="mt-4">
            <OrdersTab key={`orders-${viewRestaurantId}`} overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
          <TabsContent value="clients" className="mt-4">
            <ClientsTab key={`clients-${viewRestaurantId}`} overrideRestaurantId={viewRestaurantId} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-44" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
            <Building2 className="size-5 text-amber-600" />
            Restaurantes
          </h2>
          <p className="text-sm text-muted-foreground">
            {restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <Button onClick={() => setShowOnboardingDialog(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <Plus className="size-4" />
          Crear Restaurante
        </Button>
      </div>

      {/* Restaurant List */}
      {restaurants.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center text-muted-foreground">
            <Building2 className="size-12 mb-3 opacity-30" />
            <p className="font-semibold">No hay restaurantes</p>
            <p className="text-sm">Crea el primer restaurante para empezar</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r) => {
            const isSuspended = r.subscriptionStatus === 'suspended'
            return (
              <Card key={r.id} className={isSuspended ? 'opacity-60 border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{r.name}</p>
                        {isSuspended ? (
                          <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 text-xs">Activo</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Flame className="size-3" />{r.slug}</span>
                        {r.address && <span>{r.address}</span>}
                        {r.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{r.phone}</span>}
                      </div>
                      {r._count && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{r._count.products || 0} productos</span>
                          <span>{r._count.users || 0} usuarios</span>
                          <span>{r._count.orders || 0} pedidos</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => setViewRestaurantId(r.id)}
                      >
                        <Eye className="size-3.5" />
                        Ver
                      </Button>
                      <Button
                        variant={isSuspended ? 'outline' : 'secondary'}
                        size="sm"
                        className={`h-8 gap-1 text-xs ${isSuspended ? '' : 'text-amber-700'}`}
                        onClick={() => handleToggleBlock(r)}
                        disabled={blockLoading === r.id}
                      >
                        {blockLoading === r.id ? (
                          <span className="size-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                        ) : isSuspended ? (
                          <><Shield className="size-3.5" /> Desbloquear</>
                        ) : (
                          <><ShieldOff className="size-3.5" /> Bloquear</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Onboarding Dialog */}
      <Dialog open={showOnboardingDialog} onOpenChange={setShowOnboardingDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-amber-600" />
              Nuevo Restaurante
            </DialogTitle>
            <DialogDescription>
              Crea un nuevo restaurante y su administrador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del restaurante *</Label>
              <Input
                placeholder="Ej: La Bartola"
                value={onboardingForm.name}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                placeholder="la-bartola"
                value={onboardingForm.slug}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={onboardingForm.address}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={onboardingForm.phone}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <p className="font-semibold flex items-center gap-2"><Users className="size-4" /> Administrador</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Juan García"
                  value={onboardingForm.adminName}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, adminName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuario *</Label>
                <Input
                  placeholder="admin"
                  value={onboardingForm.adminUsername}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, adminUsername: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={onboardingForm.adminPassword}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, adminPassword: e.target.value })}
              />
            </div>
            {onboardingError && (
              <p className="text-sm text-red-600 text-center">{onboardingError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardingDialog(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={onboardingLoading || !onboardingForm.name || !onboardingForm.slug || !onboardingForm.adminUsername || !onboardingForm.adminPassword}
              onClick={handleOnboarding}
            >
              {onboardingLoading ? 'Creando...' : 'Crear Restaurante'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar restaurante?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteTarget?.name}</strong> y todos sus datos asociados (productos, usuarios, pedidos, etc.). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteLoading}
              onClick={handleDeleteRestaurant}
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
