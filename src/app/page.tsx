'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  Users,
  Wifi,
  WifiOff,
  ChefHat,
  Utensils,
  Receipt,
  CreditCard,
  UserCircle,
  Wine,
  BarChart3,
  Building2,
  AlertTriangle,
  LogOut,
  Lock,
  FileText,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRestaurantStore, type TabId } from '@/lib/store'
import { toast } from 'sonner'
import { AuthContext, useAuth } from '@/components/common/auth-context'
import type { AuthContextType } from '@/types/restaurant'
import { clientHasPermission } from '@/lib/client-permissions'

// ─── Screen imports ─────────────────────────────────────────────────────────
import { CamareroTab } from '@/components/screens/camarero-screen'
import { CocinaTab } from '@/components/screens/cocina-screen'
import { BarraTab } from '@/components/screens/barra-screen'
import { CajaTab } from '@/components/screens/caja-screen'
import { SuperAdminPanel } from '@/components/screens/super-admin-screen'

// ─── Tab imports ────────────────────────────────────────────────────────────
import { DashboardTab } from '@/components/tabs/dashboard-tab'
import { UsersTab } from '@/components/tabs/users-tab'
import { TablesTab } from '@/components/tabs/tables-tab'
import { ProductsTab } from '@/components/tabs/products-tab'
import { OrdersTab } from '@/components/tabs/orders-tab'
import { ClientsTab } from '@/components/tabs/clients-tab'
import { ReportesTab } from '@/components/tabs/reportes-tab'
import { SettingsTab } from '@/components/tabs/settings-tab'

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  const { activeTab, setActiveTab, realtimeConnected, setRealtimeConnected, clearAllState } = useRestaurantStore()

  // ─── Auth State ────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ userId: string; username: string; role: string; name: string; restaurantId?: string; mustChangePassword?: boolean } | null>(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginRequiresRestaurant, setLoginRequiresRestaurant] = useState(false)
  const [loginRestaurantOptions, setLoginRestaurantOptions] = useState<{ slug: string; name: string }[]>([])
  const [loginSelectedSlug, setLoginSelectedSlug] = useState('')

  // ─── Must Change Password State ──────────────────────────────
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)
  const [changePasswordCurrent, setChangePasswordCurrent] = useState('')
  const [changePasswordNew, setChangePasswordNew] = useState('')
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('')
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')

  // ─── SaaS Subscription State ────────────────────────────────
  const [subscriptionSuspended, setSubscriptionSuspended] = useState(false)

  // ─── Restaurant Name (for header display) ────────────────────
  const [currentRestaurantName, setCurrentRestaurantName] = useState<string | null>(null)

  // Load auth from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('restaurantos_auth')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Check if token is expired before using it
        if (parsed.token) {
          try {
            const base64Url = parsed.token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            )
            const { exp } = JSON.parse(jsonPayload)
            if (exp && exp * 1000 > Date.now()) {
              setAuthToken(parsed.token)
              setCurrentUser(parsed.user)
              // Auto-select tab based on role on restore
              const role = parsed.user?.role
              if (role === 'cocina') setActiveTab('cocina')
              else if (role === 'barra') setActiveTab('barra')
              else if (role === 'caja') setActiveTab('caja')
            } else if (parsed.refreshToken) {
              // Try to refresh the token
              fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: parsed.refreshToken }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.token) {
                    const userData = { userId: data.user.id, username: data.user.username, name: data.user.name, role: data.user.role, zone: data.user.zone ?? null, restaurantId: data.user.restaurantId, mustChangePassword: data.mustChangePassword ?? data.user.mustChangePassword ?? false }
                    setAuthToken(data.token)
                    setCurrentUser(userData)
                    localStorage.setItem('restaurantos_auth', JSON.stringify({ token: data.token, refreshToken: data.refreshToken, user: userData }))
                    // Auto-select tab based on role on refresh
                    if (userData.role === 'cocina') setActiveTab('cocina')
                    else if (userData.role === 'barra') setActiveTab('barra')
                    else if (userData.role === 'caja') setActiveTab('caja')
                  } else {
                    localStorage.removeItem('restaurantos_auth')
                  }
                })
                .catch(() => localStorage.removeItem('restaurantos_auth'))
            } else {
              localStorage.removeItem('restaurantos_auth')
            }
          } catch {
            // If token parsing fails, still try to use it
            setAuthToken(parsed.token)
            setCurrentUser(parsed.user)
            // Auto-select tab based on role on fallback
            const role = parsed.user?.role
            if (role === 'cocina') setActiveTab('cocina')
            else if (role === 'barra') setActiveTab('barra')
            else if (role === 'caja') setActiveTab('caja')
          }
        }
      } catch { /* ignore */ }
    }
  }, [])

  const authHeaders = useCallback((contentType = true) => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    if (currentUser?.restaurantId) headers['X-Restaurant-Id'] = currentUser.restaurantId
    return headers
  }, [authToken, currentUser?.restaurantId])

  const handleFetchResponse = useCallback((res: Response) => {
    if (res.status === 401) {
      setAuthToken(null)
      setCurrentUser(null)
      localStorage.removeItem('restaurantos_auth')
      toast.error('Sesión expirada')
      return false
    }
    return true
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setCurrentUser(null)
    setCurrentRestaurantName(null)
    localStorage.removeItem('restaurantos_auth')
    clearAllState()
  }, [clearAllState])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const loginPayload: Record<string, string> = { username: loginUsername, password: loginPassword }
      // If user selected a restaurant slug (for multi-restaurant username disambiguation), send it
      if (loginRequiresRestaurant && loginSelectedSlug) {
        loginPayload.restaurantSlug = loginSelectedSlug
      }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      })
      const data = await res.json()
      if (res.ok) {
        const userData = { userId: data.user.id, username: data.user.username, name: data.user.name, role: data.user.role, restaurantId: data.user.restaurantId, mustChangePassword: data.mustChangePassword ?? data.user.mustChangePassword ?? false }
        setAuthToken(data.token)
        setCurrentUser(userData)
        localStorage.setItem('restaurantos_auth', JSON.stringify({ token: data.token, refreshToken: data.refreshToken, user: userData }))
        setLoginUsername('')
        setLoginPassword('')
        setLoginRequiresRestaurant(false)
        setLoginRestaurantOptions([])
        setLoginSelectedSlug('')
        // Auto-select the correct tab based on role
        if (userData.role === 'cocina') setActiveTab('cocina')
        else if (userData.role === 'barra') setActiveTab('barra')
        else if (userData.role === 'caja') setActiveTab('caja')
        else setActiveTab('camarero')
        // Check must change password
        if (userData.mustChangePassword) {
          setShowChangePasswordDialog(true)
        }
      } else {
        // Handle multi-restaurant username disambiguation
        if (data.requiresRestaurant && data.restaurants) {
          setLoginRequiresRestaurant(true)
          setLoginRestaurantOptions(data.restaurants)
          setLoginError(data.error || 'Seleccione un restaurante para continuar')
        } else {
          setLoginError(data.error || 'Error al iniciar sesión')
        }
      }
    } catch {
      setLoginError('Error de red')
    } finally {
      setLoginLoading(false)
    }
  }

  // Real-time status: always "connected" (polling mode, no Socket.io)
  useEffect(() => {
    if (!authToken) return
    setRealtimeConnected(true)
  }, [authToken, setRealtimeConnected])

  // Fetch restaurant info to check subscription status AND get restaurant name
  useEffect(() => {
    if (!authToken || !currentUser?.restaurantId) {
      setCurrentRestaurantName(null)
      return
    }
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${currentUser.restaurantId}`, { headers: authHeaders(false) })
        if (res.ok) {
          const data = await res.json()
          const restaurant = data.restaurant ?? data
          setSubscriptionSuspended(restaurant.subscriptionStatus === 'suspended')
          setCurrentRestaurantName(restaurant.name ?? null)
        }
      } catch { /* silently fail */ }
    }
    fetchRestaurant()
  }, [authToken, currentUser?.restaurantId, authHeaders])

  const mainTabs = [
    { id: 'camarero' as TabId, label: 'Camarero', icon: <Utensils className="size-4" /> },
    { id: 'barra' as TabId, label: 'Barra', icon: <Wine className="size-4" /> },
    { id: 'cocina' as TabId, label: 'Cocina', icon: <ChefHat className="size-4" /> },
    { id: 'caja' as TabId, label: 'Caja', icon: <CreditCard className="size-4" /> },
  ]

  // Filter main tabs by role (explicit so barra→only Barra, cocina→only Cocina)
  const visibleMainTabs = mainTabs.filter((tab) => {
    if (!currentUser) return false
    const role = currentUser.role
    switch (tab.id) {
      case 'camarero': return ['super_admin', 'admin', 'encargado', 'camarero'].includes(role)
      case 'barra': return ['super_admin', 'admin', 'encargado', 'barra'].includes(role)
      case 'cocina': return ['super_admin', 'admin', 'encargado', 'cocina'].includes(role)
      case 'caja': return ['super_admin', 'admin', 'encargado', 'caja'].includes(role)
      default: return true
    }
  })

  const adminTabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { id: 'users' as TabId, label: 'Usuarios', icon: <Users className="size-4" /> },
    { id: 'tables' as TabId, label: 'Mesas', icon: <UtensilsCrossed className="size-4" /> },
    { id: 'products' as TabId, label: 'Productos', icon: <Package className="size-4" /> },
    { id: 'orders' as TabId, label: 'Pedidos', icon: <Receipt className="size-4" /> },
    { id: 'clients' as TabId, label: 'Clientes', icon: <UserCircle className="size-4" /> },
    { id: 'settings' as TabId, label: 'Fiscal / Ticket', icon: <FileText className="size-4" /> },
  ]

  // Filter admin tabs by permissions
  const visibleAdminTabs = adminTabs.filter((tab) => {
    if (!currentUser) return false
    switch (tab.id) {
      case 'dashboard': return clientHasPermission(currentUser.role, 'dashboard:read')
      case 'users': return clientHasPermission(currentUser.role, 'users:read')
      case 'tables': return clientHasPermission(currentUser.role, 'tables:read')
      case 'products': return clientHasPermission(currentUser.role, 'products:read')
      case 'orders': return clientHasPermission(currentUser.role, 'orders:read')
      case 'clients': return clientHasPermission(currentUser.role, 'clients:read')
      case 'settings': return ['super_admin', 'admin', 'encargado'].includes(currentUser.role)
      default: return true
    }
  })

  // Roles that can access the reportes tab
  const canAccessReportes = currentUser && ['super_admin', 'admin', 'encargado'].includes(currentUser.role)

  // ─── Login Screen ──────────────────────────────────────────────
  if (!authToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <Card className="w-full max-w-sm rounded-2xl shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 mb-3">
              <img
  src="/brand/restaurantos-logo.png"
  alt="RestaurantOS"
  className="h-16 w-16 rounded-2xl object-contain"
/>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-800">RestaurantOS</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Inicia sesión para continuar</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="usuario"
                  value={loginUsername}
                  onChange={(e) => { setLoginUsername(e.target.value); setLoginRequiresRestaurant(false); setLoginRestaurantOptions([]); setLoginSelectedSlug('') }}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              {loginRequiresRestaurant && loginRestaurantOptions.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="restaurant">Restaurante</Label>
                  <select
                    id="restaurant"
                    value={loginSelectedSlug}
                    onChange={(e) => setLoginSelectedSlug(e.target.value)}
                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">— Seleccione restaurante —</option>
                    {loginRestaurantOptions.map((r) => (
                      <option key={r.slug} value={r.slug}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {loginError && (
                <p className="text-sm text-red-600 text-center">{loginError}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white text-base font-semibold"
                disabled={loginLoading}
              >
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Authenticated App ─────────────────────────────────────────
  return (
    <AuthContext.Provider value={{ authToken, currentUser, authHeaders, handleFetchResponse, logout }}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Suspended subscription banner */}
        {subscriptionSuspended && currentUser?.role !== 'super_admin' && (
          <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="size-4" />
            Restaurante suspendido. Contacte al administrador del sistema.
          </div>
        )}

        {/* Must Change Password Dialog */}
        <Dialog open={showChangePasswordDialog} onOpenChange={() => { /* unclosable */ }}>
          <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="size-5 text-amber-600" />
                Cambio de contraseña requerido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Contraseña actual</Label>
                <Input type="password" value={changePasswordCurrent} onChange={(e) => setChangePasswordCurrent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input type="password" value={changePasswordNew} onChange={(e) => setChangePasswordNew(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nueva contraseña</Label>
                <Input type="password" value={changePasswordConfirm} onChange={(e) => setChangePasswordConfirm(e.target.value)} />
              </div>
              {changePasswordError && (
                <p className="text-sm text-red-600 text-center">{changePasswordError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={changePasswordLoading || !changePasswordCurrent || !changePasswordNew || !changePasswordConfirm}
                onClick={async () => {
                  setChangePasswordError('')
                  if (changePasswordNew !== changePasswordConfirm) {
                    setChangePasswordError('Las contraseñas no coinciden')
                    return
                  }
                  if (changePasswordNew.length < 4) {
                    setChangePasswordError('La contraseña debe tener al menos 4 caracteres')
                    return
                  }
                  setChangePasswordLoading(true)
                  try {
                    const res = await fetch('/api/users/change-password', {
                      method: 'POST',
                      headers: authHeaders(),
                      body: JSON.stringify({ currentPassword: changePasswordCurrent, newPassword: changePasswordNew }),
                    })
                    if (res.ok) {
                      toast.success('Contraseña cambiada correctamente')
                      const updatedUser = { ...currentUser!, mustChangePassword: false }
                      setCurrentUser(updatedUser)
                      localStorage.setItem('restaurantos_auth', JSON.stringify({ token: authToken, refreshToken: JSON.parse(localStorage.getItem('restaurantos_auth') || '{}').refreshToken, user: updatedUser }))
                      setShowChangePasswordDialog(false)
                      setChangePasswordCurrent('')
                      setChangePasswordNew('')
                      setChangePasswordConfirm('')
                    } else {
                      const err = await res.json()
                      setChangePasswordError(err.error || 'Error al cambiar contraseña')
                    }
                  } catch {
                    setChangePasswordError('Error de red')
                  } finally {
                    setChangePasswordLoading(false)
                  }
                }}
              >
                {changePasswordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Top bar */}
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <img
                  src="/brand/restaurantos-logo.png"
                   alt="RestaurantOS"
                    className="h-9 w-9 rounded-xl object-contain"
            />
              <span className="font-bold text-lg hidden sm:inline">RestaurantOS</span>
            </div>
            <div className="flex items-center gap-2">
              {realtimeConnected ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  <Wifi className="size-3 mr-1" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                  <WifiOff className="size-3 mr-1" /> Offline
                </Badge>
              )}
              {currentRestaurantName && currentUser?.role !== 'super_admin' && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">
                  <Building2 className="size-3 mr-1" />
                  {currentRestaurantName}
                </Badge>
              )}
              {currentUser && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs">
                  <UserCircle className="size-3 mr-1" />
                  {currentUser.name} · {currentUser.role}
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-red-600" onClick={logout}>
                <LogOut className="size-4 mr-1" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </header>

        {/* ─── SUPER ADMIN VIEW ─── */}
        {currentUser?.role === 'super_admin' ? (
          <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-4">
            <SuperAdminPanel />
          </main>
        ) : (
          /* ─── REGULAR USER VIEW (tabs) ─── */
          <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
              {/* Main tabs */}
              <div className="mb-4">
                <TabsList className="h-12 bg-amber-100/60 p-1">
                  {visibleMainTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-10 data-[state=active]:bg-amber-600 data-[state=active]:text-white gap-1.5 text-sm font-medium px-4"
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="camarero" className="mt-0">
                <CamareroTab />
              </TabsContent>

              <TabsContent value="barra" className="mt-0">
                <BarraTab />
              </TabsContent>

              <TabsContent value="cocina" className="mt-0">
                <CocinaTab />
              </TabsContent>

              <TabsContent value="caja" className="mt-0">
                <CajaTab />
              </TabsContent>

              {/* Admin tabs - small secondary row */}
              {visibleAdminTabs.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Administración</p>
                <TabsList className="h-9 bg-muted p-0.5">
                  {visibleAdminTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-8 data-[state=active]:bg-background gap-1 text-xs font-medium px-3"
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                  {canAccessReportes && (
                    <TabsTrigger
                      value="reportes"
                      className="h-8 data-[state=active]:bg-background gap-1 text-xs font-medium px-3"
                    >
                      <BarChart3 className="size-3.5" />
                      <span className="hidden sm:inline">Reportes</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              )}

              <TabsContent value="dashboard" className="mt-2">
                <DashboardTab />
              </TabsContent>

              <TabsContent value="users" className="mt-2">
                <UsersTab />
              </TabsContent>

              <TabsContent value="products" className="mt-2">
                <ProductsTab />
              </TabsContent>

              <TabsContent value="tables" className="mt-2">
                <TablesTab />
              </TabsContent>

              <TabsContent value="orders" className="mt-2">
                <OrdersTab />
              </TabsContent>

              <TabsContent value="clients" className="mt-2">
                <ClientsTab />
              </TabsContent>

              <TabsContent value="reportes" className="mt-2">
                <ReportesTab />
              </TabsContent>

              <TabsContent value="settings" className="mt-2">
                <SettingsTab />
              </TabsContent>
            </Tabs>
          </main>
        )}
      </div>
    </AuthContext.Provider>
  )
}
