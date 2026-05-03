import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// TODO: Replace plain text password comparison with bcrypt when available
// This is a temporary implementation for development purposes only

export async function GET() {
  try {
    // Check if super admin exists, if not create default one
    const existingAdmin = await db.admin.findFirst({
      where: { role: 'super_admin' },
    })

    if (!existingAdmin) {
      // TODO: Hash the default password with bcrypt before storing
      const admin = await db.admin.create({
        data: {
          username: 'admin',
          passwordHash: 'admin123', // TODO: Use bcrypt.hash('admin123', 10)
          role: 'super_admin',
        },
      })
      return NextResponse.json({
        message: 'Default super admin created',
        admin: { id: admin.id, username: admin.username, role: admin.role },
      })
    }

    return NextResponse.json({
      message: 'Super admin already exists',
      admin: {
        id: existingAdmin.id,
        username: existingAdmin.username,
        role: existingAdmin.role,
      },
    })
  } catch (error) {
    console.error('Auth GET error:', error)
    return NextResponse.json(
      { error: 'Failed to check/create admin' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const admin = await db.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // TODO: Replace plain text comparison with bcrypt.compare(password, admin.passwordHash)
    if (admin.passwordHash !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('Auth POST error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
