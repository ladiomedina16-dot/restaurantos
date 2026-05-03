// ============================================================
// /api/users — User management CRUD
// GET  /api/users       → List users (requires users:read)
// POST /api/users       → Create user (requires users:create)
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authenticateAndAuthorize, hashPassword, type JwtPayload } from '@/lib/auth'

// ─── GET /api/users ─────────────────────────────────────────

export async function GET(request: Request) {
  const auth = authenticateAndAuthorize(request, 'users:read')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}

    if (role) {
      where.role = role
    }

    if (active !== null) {
      where.active = active === 'true'
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

// ─── POST /api/users ────────────────────────────────────────

export async function POST(request: Request) {
  const auth = authenticateAndAuthorize(request, 'users:create')
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const body = await request.json()
    const { username, password, name, role, active } = body as {
      username: string
      password: string
      name?: string
      role?: string
      active?: boolean
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username y password son obligatorios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'El password debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: JwtPayload['role'][] = [
      'super_admin', 'admin', 'encargado', 'camarero', 'cocina', 'caja',
    ]
    const userRole = role ?? 'camarero'
    if (!validRoles.includes(userRole as JwtPayload['role'])) {
      return NextResponse.json(
        { error: `Rol inválido. Válidos: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Only super_admin can create super_admin or admin users
    if (
      (userRole === 'super_admin' || userRole === 'admin') &&
      user.role !== 'super_admin'
    ) {
      return NextResponse.json(
        { error: 'Permisos insuficientes para crear este rol.' },
        { status: 403 }
      )
    }

    // Check if username already exists
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const newUser = await db.user.create({
      data: {
        username,
        passwordHash,
        name: name ?? '',
        role: userRole,
        active: active ?? true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
