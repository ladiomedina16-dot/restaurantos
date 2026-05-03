// ============================================================
// /api/products/[id] — Single product operations
// GET    /api/products/[id]  → Get product (any authenticated user)
// PUT    /api/products/[id]  → Update product (requires products:update)
// DELETE /api/products/[id]  → Delete product (requires products:delete)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, authenticateRequest } from '@/lib/auth'

// ─── GET /api/products/[id] ─────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Any authenticated user can read a product
  const auth = authenticateRequest(request)
  if (!auth.success) return auth.response

  try {
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// ─── PUT /api/products/[id] ─────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'products:update')
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, price, category, stock, imageUrl, active } = body as {
      name?: string
      description?: string
      price?: number
      category?: string
      stock?: number
      imageUrl?: string
      active?: boolean
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = parseFloat(String(price))
    if (category !== undefined) updateData.category = category
    if (stock !== undefined) updateData.stock = stock
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (active !== undefined) updateData.active = active

    const product = await db.product.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/products/[id] ──────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'products:delete')
  if ('error' in auth) return auth.error

  try {
    const { id } = await params

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Soft delete: set active=false
    const product = await db.product.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
