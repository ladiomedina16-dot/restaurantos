// ============================================================
// /api/clients — Client management
// GET  /api/clients   → List clients (any authenticated user)
// POST /api/clients   → Create client (requires clients:create)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, authenticateRequest } from '@/lib/auth'

// ─── GET /api/clients ───────────────────────────────────────

export async function GET(request: Request) {
  // Any authenticated user can read clients
  const auth = authenticateRequest(request)
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const clients = await db.client.findMany({
      where,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Clients GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// ─── POST /api/clients ──────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'clients:create')
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { name, phone, email, notes } = body as {
      name: string
      phone: string
      email?: string
      notes?: string
    }

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    // Check if phone already exists
    const existing = await db.client.findUnique({
      where: { phone },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A client with this phone number already exists' },
        { status: 409 }
      )
    }

    const client = await db.client.create({
      data: {
        name,
        phone,
        email: email ?? '',
        notes: notes ?? '',
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('Clients POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}
