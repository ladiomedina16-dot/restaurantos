import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const table = await db.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { notIn: ['paid', 'cancelled'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ table })
  } catch (error) {
    console.error('Table GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { number, capacity, zone, status, notes, active } = body as {
      number?: number
      capacity?: number
      zone?: string
      status?: string
      notes?: string
      active?: boolean
    }

    const existing = await db.table.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // If changing table number, check uniqueness
    if (number !== undefined && number !== existing.number) {
      const duplicate = await db.table.findUnique({ where: { number } })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Table number already exists' },
          { status: 409 }
        )
      }
    }

    const validStatuses = ['available', 'occupied', 'reserved']
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (number !== undefined) updateData.number = number
    if (capacity !== undefined) updateData.capacity = capacity
    if (zone !== undefined) updateData.zone = zone
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (active !== undefined) updateData.active = active

    const table = await db.table.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ table })
  } catch (error) {
    console.error('Table PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.table.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Soft delete: set active=false
    const table = await db.table.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ table })
  } catch (error) {
    console.error('Table DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    )
  }
}
