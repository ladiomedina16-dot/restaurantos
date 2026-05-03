import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/orders/[id]/pay
// Cierra la cuenta: aplica descuento 5ª gratis, suma puntos CRM, libera mesa
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { applyDiscount = true } = body as { applyDiscount?: boolean }

    const existing = await db.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        table: true,
        client: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (existing.status === 'paid') {
      return NextResponse.json({ error: 'Este pedido ya está pagado' }, { status: 400 })
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json({ error: 'No se puede pagar un pedido cancelado' }, { status: 400 })
    }

    // ─── REGLA 5ª GRATIS ──────────────────────────
    // Si hay cliente asociado y 5+ bebidas, descontar 1.50€ por cada 5 bebidas
    let discount = 0
    let freeDrinkCount = 0
    const CANA_PRICE = 1.50 // precio de una Caña de Cruzcampo

    if (applyDiscount && existing.clientId) {
      // Contar bebidas en el pedido
      const bebidaItems = existing.items.filter(
        (item) => item.product.category === 'bebida'
      )
      const totalBebidas = bebidaItems.reduce((sum, item) => sum + item.quantity, 0)

      if (totalBebidas >= 5) {
        freeDrinkCount = Math.floor(totalBebidas / 5)
        discount = freeDrinkCount * CANA_PRICE
      }
    }

    const subtotal = existing.subtotal || existing.total
    const totalAfterDiscount = Math.max(0, subtotal - discount)

    // ─── Puntos de fidelidad: 1€ = 1 punto ────────
    const pointsEarned = Math.floor(totalAfterDiscount)

    // ─── Transacción atómica ───────────────────────
    const result = await db.$transaction(async (tx) => {
      // Actualizar pedido: discount, total, status = paid
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'paid',
          subtotal,
          discount,
          total: totalAfterDiscount,
        },
        include: {
          items: { include: { product: true } },
          table: true,
          client: true,
        },
      })

      // Liberar mesa si no hay otros pedidos activos
      const activeOrdersCount = await tx.order.count({
        where: {
          tableId: existing.tableId,
          status: { notIn: ['paid', 'cancelled'] },
          id: { not: id },
        },
      })

      if (activeOrdersCount === 0) {
        await tx.table.update({
          where: { id: existing.tableId },
          data: { status: 'available' },
        })
      }

      // Sumar puntos al cliente si existe
      if (existing.clientId && pointsEarned > 0) {
        await tx.client.update({
          where: { id: existing.clientId },
          data: {
            points: { increment: pointsEarned },
          },
        })
      }

      return updatedOrder
    })

    return NextResponse.json({
      order: result,
      payment: {
        subtotal,
        discount,
        freeDrinkCount,
        total: totalAfterDiscount,
        pointsEarned,
        clientId: existing.clientId,
        clientName: existing.client?.name,
      },
    })
  } catch (error) {
    console.error('Order pay error:', error)
    return NextResponse.json(
      { error: 'Error al procesar el pago' },
      { status: 500 }
    )
  }
}
