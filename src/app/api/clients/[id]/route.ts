// ============================================================
// /api/clients/[id] — Single client operations
// GET    /api/clients/[id]  → Get client (any authenticated user)
// PUT    /api/clients/[id]  → Update client (requires clients:update)
// DELETE /api/clients/[id]  → Delete client (requires clients:delete)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, authenticateRequest } from '@/lib/auth'

// ─── GET /api/clients/[id] ──────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Any authenticated user can read a client
  const auth = authenticateRequest(request)
  if (!auth.success) return auth.response

  try {
    const { id } = await params

    const client = await db.client.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            table: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Client GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// ─── PUT /api/clients/[id] ──────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'clients:update')
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, notes, points, visits } = body as {
      name?: string
      phone?: string
      email?: string
      notes?: string
      points?: number
      visits?: number
    }

    const existing = await db.client.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // If changing phone, check uniqueness
    if (phone !== undefined && phone !== existing.phone) {
      const duplicate = await db.client.findUnique({ where: { phone } })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A client with this phone number already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (notes !== undefined) updateData.notes = notes
    if (points !== undefined) updateData.points = points
    if (visits !== undefined) updateData.visits = visits

    const client = await db.client.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Client PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/clients/[id] ───────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'clients:delete')
  if ('error' in auth) return auth.error

  try {
    const { id } = await params

    const existing = await db.client.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if client has active orders
    const activeOrders = await db.order.count({
      where: {
        clientId: id,
        status: { notIn: ['paid', 'cancelled'] },
      },
    })

    if (activeOrders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with active orders' },
        { status: 400 }
      )
    }

    // Delete the client (their completed orders will have clientId set to null)
    await db.client.delete({ where: { id } })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Client DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
