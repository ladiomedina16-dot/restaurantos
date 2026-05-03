import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }

    if (active !== null) {
      where.active = active === 'true'
    }

    const products = await db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, price, category, stock, imageUrl } = body as {
      name: string
      description?: string
      price: number
      category?: string
      stock?: number
      imageUrl?: string
    }

    if (!name || price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      )
    }

    if (price < 0) {
      return NextResponse.json(
        { error: 'Price cannot be negative' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        name,
        description: description ?? '',
        price: parseFloat(String(price)),
        category: category ?? 'general',
        stock: stock ?? 0,
        imageUrl: imageUrl ?? '',
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Products POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
