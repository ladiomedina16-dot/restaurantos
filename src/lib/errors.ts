// ============================================================
// Global error handling + consistent API responses
// ============================================================

import { NextResponse } from 'next/server'

// ─── Standard API Response ─────────────────────────────────

export function apiSuccess(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status })
}

export function apiCreated(data: Record<string, unknown>) {
  return NextResponse.json(data, { status: 201 })
}

export function apiError(message: string, status = 500, details?: Record<string, unknown>) {
  const response: Record<string, unknown> = { error: message }
  if (details) response.details = details
  return NextResponse.json(response, { status })
}

export function apiBadRequest(message: string) {
  return apiError(message, 400)
}

export function apiUnauthorized(message = 'No autorizado. Token requerido.') {
  return apiError(message, 401)
}

export function apiForbidden(message = 'Permisos insuficientes.') {
  return apiError(message, 403)
}

export function apiNotFound(message = 'Recurso no encontrado') {
  return apiError(message, 404)
}

export function apiConflict(message: string) {
  return apiError(message, 409)
}

export function apiTooManyRequests(message = 'Demasiadas peticiones. Inténtalo más tarde.') {
  return apiError(message, 429)
}

// ─── Error logging ─────────────────────────────────────────

export function logApiError(context: string, error: unknown) {
  const timestamp = new Date().toISOString()
  if (error instanceof Error) {
    console.error(`[${timestamp}] [API ERROR] ${context}:`, error.message, error.stack)
  } else {
    console.error(`[${timestamp}] [API ERROR] ${context}:`, error)
  }
}

// ─── Safe async handler wrapper ────────────────────────────

import { Prisma } from '@prisma/client'

export function handleApiError(context: string, error: unknown): NextResponse {
  logApiError(context, error)

  // Prisma specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return apiConflict('Ya existe un registro con estos datos únicos')
      case 'P2025':
        return apiNotFound('Registro no encontrado')
      case 'P2003':
        return apiBadRequest('Referencia a registro inexistente')
      default:
        return apiError(`Error de base de datos (${error.code})`, 500)
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiBadRequest('Datos de entrada inválidos')
  }

  // Generic errors
  if (error instanceof Error) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      return apiError('Error interno del servidor')
    }
    return apiError(error.message, 500)
  }

  return apiError('Error interno del servidor', 500)
}
