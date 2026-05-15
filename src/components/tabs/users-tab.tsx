'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { UserItem } from '@/types/restaurant'
import { clientHasPermission } from '@/lib/client-permissions'
import { roleLabels, roleColors } from '@/lib/constants'
import { zoneConfig } from '@/lib/config-ui'
import { toast } from 'sonner'
import { Plus, Search, Shield, ShieldOff, Lock, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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

export function UsersTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Create user form
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('camarero')
  const [formZone, setFormZone] = useState<string>('')
  const [formActive, setFormActive] = useState(true)
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const canCreate = currentUser && clientHasPermission(currentUser.role, 'users:create')
  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'users:update')
  const canDelete = currentUser && clientHasPermission(currentUser.role, 'users:delete')

  const fetchUsers = useCallback(async () => {
    try {
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/users', { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setUsers(json.users)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, overrideRestaurantId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreateUser = async () => {
    if (!formUsername || !formPassword || !formName) {
      toast.error('Completa todos los campos obligatorios')
      return
    }
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        username: formUsername,
        password: formPassword,
        name: formName,
        role: formRole,
        active: formActive,
        mustChangePassword: true,
      }
      if (overrideRestaurantId) body.restaurantId = overrideRestaurantId
      if (formRole === 'camarero' && formZone) {
        body.zone = formZone
      }
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Usuario creado correctamente')
        setShowCreateDialog(false)
        setFormUsername('')
        setFormPassword('')
        setFormName('')
        setFormRole('camarero')
        setFormZone('')
        setFormActive(true)
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al crear usuario')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (user: UserItem) => {
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: user.id, active: !user.active }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success(user.active ? 'Usuario desactivado' : 'Usuario activado')
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar usuario')
      }
    } catch {
      toast.error('Error de red')
    }
  }

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return
    setResetting(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/users/${resetUserId}/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newPassword }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Contraseña restablecida')
        setShowResetDialog(false)
        setResetUserId(null)
        setNewPassword('')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al restablecer contraseña')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setResetting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers,
      })
      if (handleFetchResponse(res) && res.ok) {
        const data = await res.json()
        toast.success('Usuario eliminado permanentemente')
        setDeleteTarget(null)
        fetchUsers()
      } else {
        let errorMsg = 'Error al eliminar usuario'
        try {
          const err = await res.json()
          errorMsg = err.error || errorMsg
        } catch { /* response not JSON */ }
        toast.error(errorMsg)
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Equipo</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-48"
            />
          </div>
          {canCreate && (
            <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className={`rounded-xl ${!user.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-base">{user.name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex items-center gap-1">
                  {canUpdate && user.id !== currentUser?.userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => handleToggleActive(user)}
                      title={user.active ? 'Desactivar' : 'Activar'}
                    >
                      {user.active ? <Shield className="size-4 text-green-600" /> : <ShieldOff className="size-4 text-red-400" />}
                    </Button>
                  )}
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => { setResetUserId(user.id); setShowResetDialog(true) }}
                      title="Restablecer contraseña"
                    >
                      <Lock className="size-4 text-muted-foreground" />
                    </Button>
                  )}
                  {canDelete && user.id !== currentUser?.userId && user.role !== 'super_admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => setDeleteTarget(user)}
                      title="Eliminar usuario"
                    >
                      <Trash2 className="size-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={roleColors[user.role] ?? 'bg-gray-100 text-gray-800'}>
                  {roleLabels[user.role] ?? user.role}
                </Badge>
                {user.zone && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700">
                    {zoneConfig[user.zone]?.label ?? user.zone}
                  </Badge>
                )}
                {user.mustChangePassword && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Lock className="size-3 mr-1" />
                    Cambio pendiente
                  </Badge>
                )}
                {!user.active && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactivo</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            No se encontraron usuarios
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Crea un nuevo miembro del equipo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de usuario *</Label>
              <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="usuario" />
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••" />
            </div>
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Juan García" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currentUser?.role === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && <SelectItem value="admin">Administrador</SelectItem>}
                  <SelectItem value="encargado">Encargado</SelectItem>
                  <SelectItem value="camarero">Camarero</SelectItem>
                  <SelectItem value="cocina">Cocina</SelectItem>
                  <SelectItem value="barra">Barra</SelectItem>
                  <SelectItem value="caja">Caja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formRole === 'camarero' && (
              <div className="space-y-2">
                <Label>Zona</Label>
                <Select value={formZone} onValueChange={setFormZone}>
                  <SelectTrigger><SelectValue placeholder="Sin zona asignada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Barra</SelectItem>
                    <SelectItem value="main">Salón</SelectItem>
                    <SelectItem value="terrace">Terraza</SelectItem>
                    <SelectItem value="private">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="userActive"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="userActive">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateUser} disabled={creating}>
              {creating ? 'Creando...' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>El usuario deberá cambiarla en su próximo inicio de sesión</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResetDialog(false); setResetUserId(null); setNewPassword('') }}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleResetPassword} disabled={resetting || !newPassword}>
              {resetting ? 'Restableciendo...' : 'Restablecer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  ¿Estás seguro de que deseas eliminar a <strong>{deleteTarget.name}</strong> (@{deleteTarget.username})?
                  <br /><br />
                  El usuario será eliminado permanentemente de la base de datos. Los pedidos y pagos históricos se conservarán.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
