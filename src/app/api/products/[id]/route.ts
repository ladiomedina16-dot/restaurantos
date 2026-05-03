// ============================================================
// /api/products/[id] — Single product operations (multi-restaurant)
// GET    /api/products/[id]  → Get product (any authenticated user, scoped to restaurant)
// PUT    /api/products/[id]  → Update product (requires products:update, scoped to restaurant)
// DELETE /api/products/[id]  → Delete product (requires products:delete, scoped to restaurant)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, requireRestaurantScope } from '@/lib/auth'
import { updateProductSchema, validateInput } from '@/lib/validations'
import { createAuditLog } from '@/lib/audit'
import { handleApiError } from '@/lib/errors'

// ─── GET /api/products/[id] ─────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'products:read')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
    })

    if (!product || product.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    return handleApiError('Product GET', error)
  }
}

// ─── PUT /api/products/[id] ─────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'products:update')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params
    const body = await request.json()

    const validation = validateInput(updateProductSchema, body)
    if (!validation.success) return validation.error

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // If changing name, check uniqueness per restaurant
    if (validation.data.name !== undefined && validation.data.name !== existing.name) {
      const duplicate = await db.product.findUnique({
        where: { name_restaurantId: { name: validation.data.name, restaurantId } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe un producto con este nombre en este restaurante' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validation.data.name !== undefined) updateData.name = validation.data.name
    if (validation.data.description !== undefined) updateData.description = validation.data.description
    if (validation.data.price !== undefined) updateData.price = validation.data.price
    if (validation.data.category !== undefined) updateData.category = validation.data.category
    if (validation.data.stock !== undefined) updateData.stock = validation.data.stock
    if (validation.data.imageUrl !== undefined) updateData.imageUrl = validation.data.imageUrl
    if (validation.data.active !== undefined) updateData.active = validation.data.active

    const product = await db.product.update({
      where: { id },
      data: updateData,
    })

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'product_updated',
      entityType: 'product',
      entityId: product.id,
      details: { updatedFields: Object.keys(updateData) },
    })

    return NextResponse.json({ product })
  } catch (error) {
    return handleApiError('Product PUT', error)
  }
}

// ─── DELETE /api/products/[id] ──────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAndAuthorize(request, 'products:delete')
  if ('error' in auth) return auth.error

  const scope = requireRestaurantScope(auth.user, request)
  if ('error' in scope) return scope.error
  const { restaurantId } = scope

  try {
    const { id } = await params

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== restaurantId) {
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

    await createAuditLog({
      restaurantId,
      userId: auth.user.userId,
      action: 'product_deleted',
      entityType: 'product',
      entityId: product.id,
      details: { name: product.name, softDelete: true },
    })

    return NextResponse.json({ product })
  } catch (error) {
    return handleApiError('Product DELETE', error)
  }
}
