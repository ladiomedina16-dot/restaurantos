// ============================================================
// Zod validation schemas for all API inputs
// ============================================================

import { z } from 'zod'

// ─── Auth ──────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1, 'Username es obligatorio').max(50),
  password: z.string().min(1, 'Password es obligatorio').max(200),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es obligatorio'),
})

// ─── Products ──────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nombre es obligatorio').max(100),
  description: z.string().max(500).optional().default(''),
  price: z.number().min(0, 'El precio no puede ser negativo').max(9999),
  category: z.enum([
    'bebida', 'tapa_fria', 'tapa_caliente', 'montadito',
    'racion', 'postre', 'comida', 'general',
  ]).optional().default('general'),
  stock: z.number().int().min(0).optional().default(0),
  imageUrl: z.string().url().optional().default(''),
})

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(9999).optional(),
  category: z.enum([
    'bebida', 'tapa_fria', 'tapa_caliente', 'montadito',
    'racion', 'postre', 'comida', 'general',
  ]).optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().optional(),
  active: z.boolean().optional(),
})

// ─── Tables ────────────────────────────────────────────────

export const createTableSchema = z.object({
  number: z.number().int().min(1, 'Número de mesa obligatorio').max(999),
  capacity: z.number().int().min(1).max(50).optional().default(4),
  zone: z.enum(['main', 'terrace', 'private', 'bar']).optional().default('main'),
  notes: z.string().max(200).optional().default(''),
})

export const updateTableSchema = z.object({
  number: z.number().int().min(1).max(999).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  zone: z.enum(['main', 'terrace', 'private', 'bar']).optional(),
  status: z.enum(['available', 'occupied', 'reserved']).optional(),
  notes: z.string().max(200).optional(),
  active: z.boolean().optional(),
})

// ─── Clients ───────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z.string().min(1, 'Nombre es obligatorio').max(100),
  phone: z.string().min(1, 'Teléfono es obligatorio').max(20),
  email: z.string().email('Email inválido').optional().default(''),
  notes: z.string().max(500).optional().default(''),
})

export const updateClientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  email: z.string().optional(),
  notes: z.string().max(500).optional(),
  points: z.number().int().min(0).optional(),
  visits: z.number().int().min(0).optional(),
})

// ─── Orders ────────────────────────────────────────────────

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID obligatorio'),
  quantity: z.number().int().min(1, 'Cantidad mínima: 1').max(99),
  notes: z.string().max(200).optional(),
  modifiers: z.array(z.string().max(50)).max(10).optional(),
})

export const createOrderSchema = z.object({
  tableId: z.string().min(1, 'Table ID obligatorio'),
  clientId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().default(''),
  items: z.array(orderItemInputSchema).min(1, 'El pedido debe tener al menos un item').max(50),
})

export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'ready', 'served', 'paid', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
})

// ─── Payment ───────────────────────────────────────────────

export const payOrderSchema = z.object({
  applyDiscount: z.boolean().optional().default(true),
  paymentMethod: z.enum(['efectivo', 'tarjeta']).optional().default('efectivo'),
})

// ─── Users ─────────────────────────────────────────────────

export const createUserSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(30),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100),
  name: z.string().max(100).optional().default(''),
  role: z.enum(['super_admin', 'admin', 'encargado', 'camarero', 'cocina', 'caja']).optional().default('camarero'),
  active: z.boolean().optional().default(true),
  zone: z.enum(['main', 'terrace', 'bar', 'private']).optional().nullable(),
  restaurantId: z.string().optional().nullable(),
})

// ─── Restaurants ───────────────────────────────────────────

export const createRestaurantSchema = z.object({
  name: z.string().min(1, 'Nombre es obligatorio').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  address: z.string().max(200).optional().default(''),
  phone: z.string().max(20).optional().default(''),
})

export const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  active: z.boolean().optional(),
})

// ─── Cash Sessions ─────────────────────────────────────────

export const openCashSessionSchema = z.object({
  openingCash: z.number().min(0, 'El dinero inicial no puede ser negativo').max(99999),
})

export const closeCashSessionSchema = z.object({
  closingCash: z.number().min(0, 'El dinero de cierre no puede ser negativo').max(99999),
})

// ─── Reports ───────────────────────────────────────────────

export const reportsQuerySchema = z.object({
  type: z.enum(['daily_sales', 'payment_methods', 'top_products', 'cancelled_orders', 'cash_closes']),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// ─── Print ─────────────────────────────────────────────────

export const printTicketSchema = z.object({
  type: z.enum(['kitchen', 'bar', 'receipt']),
  orderId: z.string().min(1),
})

// ─── Change Password ───────────────────────────────────────

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual obligatoria'),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres').max(100),
})

// ─── Reset Password (admin) ────────────────────────────────

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mínimo 6 caracteres').max(100),
})

// ─── Onboarding ────────────────────────────────────────────

export const onboardingSchema = z.object({
  restaurantName: z.string().min(1, 'El nombre del restaurante es obligatorio').max(100),
  slug: z.string().min(1, 'El slug es obligatorio').max(50).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  address: z.string().max(200).optional().default(''),
  phone: z.string().max(20).optional().default(''),
  adminName: z.string().min(1, 'El nombre del administrador es obligatorio').max(100),
  adminUsername: z.string().min(3, 'Mínimo 3 caracteres').max(30),
  adminPassword: z.string().min(6, 'Mínimo 6 caracteres').max(100),
})

// ─── Update Restaurant (with subscriptionStatus) ───────────

export const updateRestaurantFullSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  active: z.boolean().optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'suspended']).optional(),
})

// ─── Update User Active Status ─────────────────────────────

export const updateUserStatusSchema = z.object({
  active: z.boolean(),
})

// ─── Validation helper ─────────────────────────────────────

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const parsed = schema.parse(data)
    return { success: true, data: parsed }
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return {
        success: false,
        error: NextResponse.json(
          { error: `Validación fallida: ${errors}` },
          { status: 400 }
        ),
      }
    }
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Error de validación' },
        { status: 400 }
      ),
    }
  }
}
