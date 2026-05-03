// ============================================================
// /api/tables — Table management
// GET  /api/tables   → List tables (any authenticated user)
// POST /api/tables   → Create table (requires tables:create)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, authenticateRequest } from '@/lib/auth'

// ─── GET /api/tables ────────────────────────────────────────

export async function GET(request: Request) {
  // Any authenticated user can read tables
  const auth = authenticateRequest(request)
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const zone = searchParams.get('zone')

    const where: Record<string, unknown> = { active: true }

    if (status) {
      where.status = status
    }

    if (zone) {
      where.zone = zone
    }

    const tables = await db.table.findMany({
      where,
      orderBy: { number: 'asc' },
    })

    return NextResponse.json({ tables })
  } catch (error) {
    console.error('Tables GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

// ─── POST /api/tables ───────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'tables:create')
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { number, capacity, zone, notes } = body as {
      number: number
      capacity?: number
      zone?: string
      notes?: string
    }

    if (number === undefined || number === null) {
      return NextResponse.json(
        { error: 'Table number is required' },
        { status: 400 }
      )
    }

    // Check if table number already exists
    const existing = await db.table.findUnique({
      where: { number },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Table number already exists' },
        { status: 409 }
      )
    }

    const table = await db.table.create({
      data: {
        number,
        capacity: capacity ?? 4,
        zone: zone ?? 'main',
        notes: notes ?? '',
      },
    })

    return NextResponse.json({ table }, { status: 201 })
  } catch (error) {
    console.error('Tables POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    )
  }
}
