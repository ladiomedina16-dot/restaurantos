'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { Client } from '@/types/restaurant'
import { clientHasPermission } from '@/lib/client-permissions'
import { toast } from 'sonner'
import { Plus, Search, Phone, Star, UserCircle, Receipt, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function ClientsTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Create form
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const canCreate = currentUser && clientHasPermission(currentUser.role, 'clients:create')
  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'clients:update')
  const canDelete = currentUser && clientHasPermission(currentUser.role, 'clients:delete')

  const fetchClients = useCallback(async () => {
    try {
      const url = searchQuery ? `/api/clients?search=${encodeURIComponent(searchQuery)}` : '/api/clients'
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(url, { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setClients(json.clients)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, searchQuery, overrideRestaurantId])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleCreateClient = async () => {
    if (!formName || !formPhone) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }
    setCreating(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: formName, phone: formPhone, email: formEmail, notes: formNotes }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Cliente creado')
        setShowCreateDialog(false)
        setFormName('')
        setFormPhone('')
        setFormEmail('')
        setFormNotes('')
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al crear cliente')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setCreating(false)
    }
  }

  const handleEditClient = async () => {
    if (!editingClient) return
    setSaving(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: editName, phone: editPhone, email: editEmail, notes: editNotes }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Cliente actualizado')
        setShowEditDialog(false)
        setEditingClient(null)
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar cliente')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClient = async (client: Client) => {
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
        headers,
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Cliente eliminado')
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al eliminar cliente')
      }
    } catch {
      toast.error('Error de red')
    }
  }

  const openEditDialog = (client: Client) => {
    setEditingClient(client)
    setEditName(client.name)
    setEditPhone(client.phone)
    setEditEmail(client.email || '')
    setEditNotes(client.notes || '')
    setShowEditDialog(true)
  }

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
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-56"
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

      {/* Clients list */}
      {clients.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            No se encontraron clientes
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-base">{client.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="size-3" />{client.phone}
                        </span>
                      )}
                    </div>
                    {client.email && (
                      <span className="text-xs text-muted-foreground">{client.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {canUpdate && (
                      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => openEditDialog(client)}>
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleDeleteClient(client)}>
                        <Trash2 className="size-3.5 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="size-3" />{client.points} pts</span>
                  <span className="flex items-center gap-1"><UserCircle className="size-3" />{client.visits} visitas</span>
                  {client._count && <span className="flex items-center gap-1"><Receipt className="size-3" />{client._count.orders} pedidos</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Client Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>Añade un nuevo cliente al restaurante</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="María López" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="612345678" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="maria@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Alergias, preferencias..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateClient} disabled={creating}>
              {creating ? 'Creando...' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEditClient} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
