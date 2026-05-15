'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/common/auth-context'
import type { SettingsData } from '@/types/restaurant'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function SettingsTab() {
  const { authHeaders, handleFetchResponse } = useAuth()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fiscalName, setFiscalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [fiscalAddress, setFiscalAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [ticketLegalText, setTicketLegalText] = useState('')
  const [defaultVatRate, setDefaultVatRate] = useState(21)
  const [logoUrl, setLogoUrl] = useState('')
  const [defaultDocumentType, setDefaultDocumentType] = useState<'ticket' | 'factura'>('ticket')

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings', { headers: authHeaders(false) })
      if (handleFetchResponse(res) && res.ok) {
        const json = await res.json()
        const s = json.settings as SettingsData
        setSettings(s)
        setFiscalName(s.fiscalName || '')
        setTaxId(s.taxId || '')
        setFiscalAddress(s.fiscalAddress || '')
        setPhone(s.phone || '')
        setEmail(s.email || '')
        setTicketLegalText(s.ticketLegalText || '')
        setDefaultVatRate(s.defaultVatRate ?? 21)
        setLogoUrl(s.logoUrl || '')
        setDefaultDocumentType(s.defaultDocumentType || 'ticket')
      }
    } catch {
      toast.error('Error al cargar la configuración fiscal')
    } finally {
      setLoading(false)
    }
  }, [authHeaders, handleFetchResponse])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({
          fiscalName,
          taxId,
          fiscalAddress,
          phone,
          email,
          ticketLegalText,
          defaultVatRate,
          logoUrl,
          defaultDocumentType,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setSettings(json.settings)
        toast.success('Configuración fiscal guardada')
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Datos fiscales / Ticket</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura los datos fiscales y el formato de ticket/factura de tu restaurante.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Fiscal name + Tax ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fiscalName">Nombre fiscal</Label>
              <Input id="fiscalName" value={fiscalName} onChange={(e) => setFiscalName(e.target.value)} placeholder="Restaurante S.L." maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">CIF / NIF</Label>
              <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="B12345678" maxLength={50} />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="fiscalAddress">Dirección fiscal</Label>
            <Input id="fiscalAddress" value={fiscalAddress} onChange={(e) => setFiscalAddress(e.target.value)} placeholder="Calle Mayor 1, 28001 Madrid" maxLength={250} />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settingsPhone">Teléfono</Label>
              <Input id="settingsPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 912 345 678" maxLength={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settingsEmail">Email</Label>
              <Input id="settingsEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@restaurante.com" />
            </div>
          </div>

          <Separator />

          {/* IVA + Document type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vatRate">IVA por defecto (%)</Label>
              <Input id="vatRate" type="number" min={0} max={30} step={0.5} value={defaultVatRate} onChange={(e) => setDefaultVatRate(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de documento por defecto</Label>
              <Select value={defaultDocumentType} onValueChange={(v) => setDefaultDocumentType(v as 'ticket' | 'factura')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticket">Ticket</SelectItem>
                  <SelectItem value="factura">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL (opcional)</Label>
            <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>

          {/* Legal text */}
          <div className="space-y-2">
            <Label htmlFor="ticketLegalText">Texto legal del ticket</Label>
            <Textarea id="ticketLegalText" value={ticketLegalText} onChange={(e) => setTicketLegalText(e.target.value)} placeholder="Gracias por su visita" maxLength={500} rows={3} />
            <p className="text-xs text-muted-foreground">{ticketLegalText.length}/500</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
        {saving ? 'Guardando...' : 'Guardar configuración fiscal'}
      </Button>

      {/* Preview */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa del ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white border rounded-lg p-4 font-mono text-xs space-y-1 max-w-xs mx-auto text-center">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 mx-auto mb-1 object-contain" />}
              <p className="font-bold">{fiscalName || 'Nombre fiscal'}</p>
              {taxId && <p>CIF/NIF: {taxId}</p>}
              {fiscalAddress && <p>{fiscalAddress}</p>}
              {(phone || email) && <p>{[phone, email].filter(Boolean).join(' | ')}</p>}
              <Separator className="my-2" />
              <p className="text-muted-foreground italic">{ticketLegalText || 'Texto legal'}</p>
              <p className="text-muted-foreground">IVA: {defaultVatRate}% · Doc: {defaultDocumentType === 'ticket' ? 'Ticket' : 'Factura'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
