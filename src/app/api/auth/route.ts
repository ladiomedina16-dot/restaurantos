// ============================================================
// /api/auth — JWT Authentication endpoints
// POST /api/auth/login  → { username, password } → JWT token + user info
// GET  /api/auth/me     → Authorization: Bearer xxx → current user
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { hashPassword, verifyPassword, signToken, verifyToken, type JwtPayload } from '@/lib/auth'

// ─── Ensure default super_admin exists on first request ─────

async function ensureSuperAdmin() {
  const existing = await db.user.findFirst({ where: { role: 'super_admin' } })
  if (!existing) {
    const hashed = await hashPassword('admin123')
    await db.user.create({
      data: {
        username: 'admin',
        passwordHash: hashed,
        name: 'Super Admin',
        role: 'super_admin',
      },
    })
  }
}

// ─── POST /api/auth/login ───────────────────────────────────

export async function POST(request: Request) {
  try {
    await ensureSuperAdmin()

    const body = await request.json()
    const { username, password } = body as {
      username: string
      password: string
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { username } })

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Usuario desactivado' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role as JwtPayload['role'],
    }

    const token = signToken(payload)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Auth login error:', error)
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    )
  }
}

// ─── GET /api/auth/me ───────────────────────────────────────

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado. Token requerido.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido o expirado.' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o desactivado.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}
