// ============================================================
// /api/print — Print ticket generation
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

// ─── Drink categories ──────────────────────────────────────
const DRINK_CATEGORIES = ['bebida']

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

    const { type, orderId } = validation.data

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

    // Fetch restaurant info
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
    })

    const restaurantName = restaurant?.name ?? 'RestaurantOS'
    const restaurantAddress = restaurant?.address ?? ''
    const restaurantPhone = restaurant?.phone ?? ''

    // Filter items by ticket type
    let filteredItems = order.items
    let html = ''

    switch (type) {
      case 'kitchen':
        // Food items only (excluding drinks)
        filteredItems = order.items.filter(
          (item) => !DRINK_CATEGORIES.includes(item.product.category)
        )
        html = generateKitchenTicket(order, filteredItems, restaurantName)
        break

      case 'bar':
        // Drinks only
        filteredItems = order.items.filter((item) =>
          DRINK_CATEGORIES.includes(item.product.category)
        )
        html = generateBarTicket(order, filteredItems, restaurantName)
        break

      case 'receipt':
        html = generateReceiptTicket(
          order,
          order.items,
          restaurantName,
          restaurantAddress,
          restaurantPhone
        )
        break
    }

    // Create audit log
    await createAuditLog({
      restaurantId,
      userId: user.userId,
      action: 'print_ticket',
      entityType: 'order',
      entityId: orderId,
      details: { type, orderId, printedBy: user.username },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return Response.json({ html, type, orderId })
  } catch (error) {
    return handleApiError('Print POST', error)
  }
}

// ─── Kitchen Ticket Generator ──────────────────────────────

function generateKitchenTicket(
  order: {
    id: string
    notes: string
    createdAt: Date
    table: { number: number; zone: string }
    client: { name: string } | null
  },
  items: {
    quantity: number
    product: { name: string; category: string }
    notes: string
    modifiers: string
  }[],
  restaurantName: string
): string {
  const now = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const itemsHtml = items
    .map((item) => {
      const modifiers = item.modifiers
        ? JSON.parse(item.modifiers || '[]')
        : []
      const modifiersHtml = modifiers.length
        ? `<div class="modifiers">${modifiers.map((m: string) => `→ ${m}`).join('<br>')}</div>`
        : ''
      const notesHtml = item.notes
        ? `<div class="item-notes">⚠ ${item.notes}</div>`
        : ''

      return `
        <div class="item">
          <span class="qty">${item.quantity}x</span>
          <span class="name">${item.product.name}</span>
          ${modifiersHtml}
          ${notesHtml}
        </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket Cocina - ${restaurantName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 12px; }
  .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
  .header h1 { font-size: 16px; font-weight: bold; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
  .item { padding: 3px 0; border-bottom: 1px dotted #ccc; }
  .qty { font-weight: bold; margin-right: 6px; }
  .name { font-weight: bold; }
  .modifiers { color: #333; font-size: 11px; padding-left: 30px; font-style: italic; }
  .item-notes { color: #c00; font-size: 11px; padding-left: 30px; font-weight: bold; }
  .order-notes { margin-top: 6px; padding: 4px; border: 1px solid #000; font-weight: bold; }
  .footer { text-align: center; margin-top: 8px; font-size: 10px; border-top: 2px dashed #000; padding-top: 6px; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
  <div class="header">
    <h1>🍳 COCINA</h1>
  </div>
  <div class="meta">
    <span>Mesa ${order.table.number} (${order.table.zone})</span>
    <span>${now}</span>
  </div>
  ${order.client ? `<div class="meta"><span>Cliente: ${order.client.name}</span></div>` : ''}
  <div class="items">
    ${itemsHtml}
  </div>
  ${order.notes ? `<div class="order-notes">NOTAS: ${order.notes}</div>` : ''}
  <div class="footer">
    Pedido #${order.id.slice(-6)} | ${restaurantName}
  </div>
</body>
</html>`
}

// ─── Bar Ticket Generator ──────────────────────────────────

function generateBarTicket(
  order: {
    id: string
    notes: string
    createdAt: Date
    table: { number: number; zone: string }
    client: { name: string } | null
  },
  items: {
    quantity: number
    product: { name: string; category: string }
    notes: string
    modifiers: string
  }[],
  restaurantName: string
): string {
  const now = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const itemsHtml = items
    .map((item) => {
      const modifiers = item.modifiers
        ? JSON.parse(item.modifiers || '[]')
        : []
      const modifiersHtml = modifiers.length
        ? `<div class="modifiers">${modifiers.map((m: string) => `→ ${m}`).join('<br>')}</div>`
        : ''
      const notesHtml = item.notes
        ? `<div class="item-notes">⚠ ${item.notes}</div>`
        : ''

      return `
        <div class="item">
          <span class="qty">${item.quantity}x</span>
          <span class="name">${item.product.name}</span>
          ${modifiersHtml}
          ${notesHtml}
        </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket Bar - ${restaurantName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 12px; }
  .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
  .header h1 { font-size: 16px; font-weight: bold; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
  .item { padding: 3px 0; border-bottom: 1px dotted #ccc; }
  .qty { font-weight: bold; margin-right: 6px; }
  .name { font-weight: bold; }
  .modifiers { color: #333; font-size: 11px; padding-left: 30px; font-style: italic; }
  .item-notes { color: #c00; font-size: 11px; padding-left: 30px; font-weight: bold; }
  .order-notes { margin-top: 6px; padding: 4px; border: 1px solid #000; font-weight: bold; }
  .footer { text-align: center; margin-top: 8px; font-size: 10px; border-top: 2px dashed #000; padding-top: 6px; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
  <div class="header">
    <h1>🍸 BAR</h1>
  </div>
  <div class="meta">
    <span>Mesa ${order.table.number} (${order.table.zone})</span>
    <span>${now}</span>
  </div>
  ${order.client ? `<div class="meta"><span>Cliente: ${order.client.name}</span></div>` : ''}
  <div class="items">
    ${itemsHtml}
  </div>
  ${order.notes ? `<div class="order-notes">NOTAS: ${order.notes}</div>` : ''}
  <div class="footer">
    Pedido #${order.id.slice(-6)} | ${restaurantName}
  </div>
</body>
</html>`
}

// ─── Receipt Ticket Generator ──────────────────────────────

function generateReceiptTicket(
  order: {
    id: string
    subtotal: number
    discount: number
    total: number
    notes: string
    createdAt: Date
    table: { number: number; zone: string }
    client: { name: string } | null
    payments: {
      amount: number
      method: string
      discount: number
      freeDrinks: number
      pointsEarned: number
      createdAt: Date
    }[]
  },
  items: {
    quantity: number
    unitPrice: number
    subtotal: number
    product: { name: string; category: string }
    notes: string
    modifiers: string
  }[],
  restaurantName: string,
  restaurantAddress: string,
  restaurantPhone: string
): string {
  const now = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const itemsHtml = items
    .map(
      (item) => `
        <div class="item">
          <span class="name">${item.quantity}x ${item.product.name}</span>
          <span class="price">${item.subtotal.toFixed(2)}€</span>
        </div>`
    )
    .join('')

  const payment = order.payments[0]
  const paymentMethod = payment?.method === 'tarjeta' ? 'Tarjeta' : 'Efectivo'

  const discountHtml =
    order.discount > 0
      ? `<div class="row discount">
          <span>Descuento (5ª gratis)</span>
          <span>-${order.discount.toFixed(2)}€</span>
        </div>`
      : ''

  const freeDrinksHtml =
    payment && payment.freeDrinks > 0
      ? `<div class="row"><span>Bebidas gratis</span><span>${payment.freeDrinks}</span></div>`
      : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Recibo - ${restaurantName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 12px; }
  .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
  .header h1 { font-size: 14px; font-weight: bold; }
  .header .info { font-size: 10px; color: #555; margin-top: 2px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; border-bottom: 1px dotted #ccc; padding-bottom: 4px; }
  .item { display: flex; justify-content: space-between; padding: 2px 0; }
  .name { flex: 1; }
  .price { font-weight: bold; min-width: 50px; text-align: right; }
  .divider { border-top: 1px dotted #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .discount { color: #c00; }
  .total-row { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; }
  .payment-info { margin-top: 6px; padding: 4px; border: 1px solid #000; font-size: 11px; }
  .footer { text-align: center; margin-top: 8px; font-size: 10px; border-top: 2px dashed #000; padding-top: 6px; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${restaurantName}</h1>
    ${restaurantAddress ? `<div class="info">${restaurantAddress}</div>` : ''}
    ${restaurantPhone ? `<div class="info">Tel: ${restaurantPhone}</div>` : ''}
  </div>
  <div class="meta">
    <span>Mesa ${order.table.number}</span>
    <span>${now}</span>
  </div>
  ${order.client ? `<div class="meta"><span>Cliente: ${order.client.name}</span></div>` : ''}
  <div class="divider"></div>
  <div class="items">
    ${itemsHtml}
  </div>
  <div class="divider"></div>
  <div class="row">
    <span>Subtotal</span>
    <span>${order.subtotal.toFixed(2)}€</span>
  </div>
  ${discountHtml}
  ${freeDrinksHtml}
  <div class="row total-row">
    <span>TOTAL</span>
    <span>${order.total.toFixed(2)}€</span>
  </div>
  <div class="payment-info">
    <div>Pago: ${paymentMethod}</div>
    ${payment ? `<div>Puntos ganados: ${payment.pointsEarned}</div>` : ''}
  </div>
  <div class="footer">
    Gracias por su visita | Pedido #${order.id.slice(-6)}
  </div>
</body>
</html>`
}
