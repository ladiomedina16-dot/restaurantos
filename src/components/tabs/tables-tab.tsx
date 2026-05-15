'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { TableItem } from '@/types/restaurant'
import { clientHasPermission } from '@/lib/client-permissions'
import { zoneOrder } from '@/lib/constants'
import { zoneConfig } from '@/lib/config-ui'
import { toast } from 'sonner'
import { Plus, Utensils, Pencil, Trash2, CircleDot } from 'lucide-react'
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

export function TablesTab({ overrideRestaurantId }: { overrideRestaurantId?: string } = {}) {
  const { authHeaders, handleFetchResponse, currentUser } = useAuth()
  const [tables, setTables] = useState<TableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTable, setEditingTable] = useState<TableItem | null>(null)

  // Create form
  const [formNumber, setFormNumber] = useState('')
  const [formCapacity, setFormCapacity] = useState('4')
  const [formZone, setFormZone] = useState('main')
  const [formNotes, setFormNotes] = useState('')
  const [creating, setCreating] = useState(false)

  // Bulk create form
  const [bulkZone, setBulkZone] = useState('main')
  const [bulkStart, setBulkStart] = useState('1')
  const [bulkCount, setBulkCount] = useState('5')
  const [bulkCapacity, setBulkCapacity] = useState('4')
  const [bulkCreating, setBulkCreating] = useState(false)

  // Edit form
  const [editNumber, setEditNumber] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [editZone, setEditZone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const canCreate = currentUser && clientHasPermission(currentUser.role, 'tables:create')
  const canUpdate = currentUser && clientHasPermission(currentUser.role, 'tables:update')
  const canDelete = currentUser && clientHasPermission(currentUser.role, 'tables:delete')

  const fetchTables = useCallback(async () => {
    try {
      const headers = authHeaders(false)
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/tables', { headers })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        setTables(json.tables)
      }
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse, overrideRestaurantId])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const handleCreateTable = async () => {
    if (!formNumber || !formCapacity) {
      toast.error('Número y capacidad son obligatorios')
      return
    }
    setCreating(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: parseInt(formNumber),
          capacity: parseInt(formCapacity),
          zone: formZone,
          notes: formNotes,
        }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Mesa creada')
        setShowCreateDialog(false)
        setFormNumber('')
        setFormCapacity('4')
        setFormNotes('')
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al crear mesa')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setCreating(false)
    }
  }

  const handleBulkCreate = async () => {
    const start = parseInt(bulkStart)
    const count = parseInt(bulkCount)
    const cap = parseInt(bulkCapacity)
    if (!start || !count || !cap || count > 50) {
      toast.error('Valores no válidos (máximo 50 mesas)')
      return
    }
    setBulkCreating(true)
    let created = 0
    try {
      for (let i = 0; i < count; i++) {
        const headers = authHeaders()
        if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
        const res = await fetch('/api/tables', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: start + i,
            capacity: cap,
            zone: bulkZone,
            notes: '',
          }),
        })
        if (res.ok) created++
      }
      toast.success(`${created} mesas creadas en ${zoneConfig[bulkZone]?.label ?? bulkZone}`)
      setShowBulkDialog(false)
      fetchTables()
    } catch {
      toast.error('Error de red')
    } finally {
      setBulkCreating(false)
    }
  }

  const handleEditTable = async () => {
    if (!editingTable) return
    setSaving(true)
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          number: parseInt(editNumber),
          capacity: parseInt(editCapacity),
          zone: editZone,
          notes: editNotes,
          active: editActive,
        }),
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Mesa actualizada')
        setShowEditDialog(false)
        setEditingTable(null)
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar mesa')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTable = async (table: TableItem) => {
    try {
      const headers = authHeaders()
      if (overrideRestaurantId) headers['X-Restaurant-Id'] = overrideRestaurantId
      const res = await fetch(`/api/tables/${table.id}`, {
        method: 'DELETE',
        headers,
      })
      if (handleFetchResponse(res) && res.ok) {
        toast.success('Mesa eliminada')
        fetchTables()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al eliminar mesa')
      }
    } catch {
      toast.error('Error de red')
    }
  }

  const openEditDialog = (table: TableItem) => {
    setEditingTable(table)
    setEditNumber(String(table.number))
    setEditCapacity(String(table.capacity))
    setEditZone(table.zone)
    setEditNotes(table.notes || '')
    setEditActive(table.active)
    setShowEditDialog(true)
  }

  // Group tables by zone
  const tablesByZone = zoneOrder
    .map((z) => ({
      zone: z,
      config: zoneConfig[z],
      zoneTables: tables.filter((t) => t.zone === z),
    }))

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
        <h2 className="text-2xl font-bold tracking-tight">Mesas</h2>
        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <Button size="sm" variant="outline" className="h-9" onClick={() => setShowBulkDialog(true)}>
                <Plus className="size-4 mr-1" />
                Crear por zona
              </Button>
              <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateDialog(true)}>
                <Plus className="size-4 mr-1" />
                Nueva mesa
              </Button>
            </>
          )}
        </div>
      </div>

      {tables.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center">
            <Utensils className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No hay mesas configuradas</p>
            {canCreate && (
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowBulkDialog(true)}>
                <Plus className="size-4 mr-1" />
                Configurar Mesas
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        tablesByZone.map(({ zone, config: cfg, zoneTables }) => (
          <div key={zone}>
            <div className="flex items-center gap-2 mb-3">
              {cfg?.icon ?? <CircleDot className="size-4" />}
              <h3 className="font-semibold text-lg">{cfg?.label ?? zone}</h3>
              <Badge variant="outline" className="text-xs">{zoneTables.length}</Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {zoneTables.map((table) => {
                const isAvailable = table.status === 'available'
                const isOccupied = table.status === 'occupied'
                return (
                  <div
                    key={table.id}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 min-h-[90px] ${
                      !table.active
                        ? 'bg-gray-100 border-gray-200 opacity-60'
                        : isOccupied
                        ? 'bg-orange-50 border-orange-300'
                        : isAvailable
                        ? 'bg-green-50 border-green-300'
                        : 'bg-amber-50 border-amber-300'
                    }`}
                  >
                    <span className="text-2xl font-bold">{table.number}</span>
                    <span className="text-xs text-muted-foreground">{table.capacity} pax</span>
                    {!table.active && <span className="text-xs text-red-500">Inactiva</span>}
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {canUpdate && (
                        <button className="p-1 rounded hover:bg-white/60" onClick={() => openEditDialog(table)}>
                          <Pencil className="size-3 text-muted-foreground" />
                        </button>
                      )}
                      {canDelete && (
                        <button className="p-1 rounded hover:bg-white/60" onClick={() => handleDeleteTable(table)}>
                          <Trash2 className="size-3 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Create Table Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva mesa</DialogTitle>
            <DialogDescription>Añade una mesa al restaurante</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input type="number" value={formNumber} onChange={(e) => setFormNumber(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Capacidad *</Label>
                <Input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} placeholder="4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select value={formZone} onValueChange={setFormZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zoneOrder.map((z) => (
                    <SelectItem key={z} value={z}>{zoneConfig[z]?.label ?? z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Ventana, junto a la barra..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateTable} disabled={creating}>
              {creating ? 'Creando...' : 'Crear mesa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear mesas por zona</DialogTitle>
            <DialogDescription>Crea múltiples mesas de una vez para una zona</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select value={bulkZone} onValueChange={setBulkZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zoneOrder.map((z) => (
                    <SelectItem key={z} value={z}>{zoneConfig[z]?.label ?? z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nº inicio</Label>
                <Input type="number" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} placeholder="5" />
              </div>
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input type="number" value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} placeholder="4" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se crearán {bulkCount || 0} mesas numeradas de la {bulkStart || 0} a la {(parseInt(bulkStart) || 0) + (parseInt(bulkCount) || 0) - 1} en {zoneConfig[bulkZone]?.label ?? bulkZone}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleBulkCreate} disabled={bulkCreating}>
              {bulkCreating ? 'Creando...' : `Crear ${bulkCount || 0} mesas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar mesa {editingTable?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input type="number" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select value={editZone} onValueChange={setEditZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zoneOrder.map((z) => (
                    <SelectItem key={z} value={z}>{zoneConfig[z]?.label ?? z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editActive"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="editActive">Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleEditTable} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
