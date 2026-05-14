// ============================================================
// /api/print — Print ticket generation (on-demand / manual)
// POST /api/print → Generate a printable ticket HTML
//   type: 'kitchen' — Kitchen ticket (food items only, excluding drinks)
//   type: 'bar'    — Bar ticket (drinks only)
//   type: 'receipt' — Payment receipt with totals, payment method, discount
// ============================================================

import { db } from '@/lib/db'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { validateInput, printTicketSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'
import {
  DRINK_CATEGORIES,
  generateKitchenTicket,
  generateBarTicket,
  generateReceiptTicket,
} from '@/lib/print-templates'

// ─── POST /api/print ───────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'print:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const scope = requireRestaurantScope(user, request)
    if ('error' in scope) return scope.error
    const { restaurantId } = scope

    const body = await request.json()
    const validation = validateInput(printTicketSchema, body)
    if (!validation.success) return validation.error

    const { type, orderId, documentType: docTypeOverride } = validation.data

    // Fetch the order with items and product details
    const order = await db.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        table: true,
        client: true,
        payments: true,
      },
    })

    if (!order) {
      return Response.json(
        { error: 'Pedido no encontrado.' },
        { status: 404 }
      )
    }

    // Fetch restaurant info + fiscal settings
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      include: { settings: true },
    })

    // Fiscal data with fallback: settings → restaurant → defaults
    const settings = restaurant?.settings
    const fiscalName = settings?.fiscalName || restaurant?.name || 'RestaurantOS'
    const fiscalAddress = settings?.fiscalAddress || restaurant?.address || ''
    const fiscalPhone = settings?.phone || restaurant?.phone || ''
    const fiscalEmail = settings?.email || ''
    const taxId = settings?.taxId || ''
    const vatRate = settings?.defaultVatRate ?? 21
    const legalText = settings?.ticketLegalText || 'Gracias por su visita'
    // Allow frontend to override document type (ticket vs factura)
    const documentType: 'ticket' | 'factura' =
  docTypeOverride === 'factura' || settings?.defaultDocumentType === 'factura'
    ? 'factura'
    : 'ticket'
    const logoUrl = settings?.logoUrl || ''

    // Filter items by ticket type
    let filteredItems = order.items
    let html = ''

    switch (type) {
      case 'kitchen':
        // Food items only (excluding drinks)
        filteredItems = order.items.filter(
          (item) => !DRINK_CATEGORIES.includes(item.product.category)
        )
        html = generateKitchenTicket(order, filteredItems, fiscalName)
        break

      case 'bar':
        // Drinks only
        filteredItems = order.items.filter((item) =>
          DRINK_CATEGORIES.includes(item.product.category)
        )
        html = generateBarTicket(order, filteredItems, fiscalName)
        break

      case 'receipt':
        html = generateReceiptTicket(
          order,
          order.items,
          { fiscalName, fiscalAddress, fiscalPhone, fiscalEmail, taxId, vatRate, legalText, documentType, logoUrl }
        )
        // NOTE: La selección de impresora depende del navegador/sistema operativo.
        // Para impresión silenciosa se requiere QZ Tray, app local o Capacitor.
        break
    }

    // Create audit log
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'print_ticket',
      entityType: 'order',
      entityId: orderId,
      details: { type, orderId, documentType: type === 'receipt' ? documentType : undefined, printedBy: user.username },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return Response.json({ html, type, orderId, documentType: type === 'receipt' ? documentType : undefined })
  } catch (error) {
    return handleApiError('Print POST', error)
  }
}
