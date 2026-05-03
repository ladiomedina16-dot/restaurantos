import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fix: System env may have a stale SQLite DATABASE_URL from initial setup.
// If the URL starts with "file:", override it with the PostgreSQL URL from .env.
// Prisma requires postgresql:// protocol for our Supabase database.
if (process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = 'postgresql://postgres.mjmqjbqjmzjwixnmxegs:Telco191517k-@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
}
if (process.env.DIRECT_URL?.startsWith('file:')) {
  process.env.DIRECT_URL = 'postgresql://postgres.mjmqjbqjmzjwixnmxegs:Telco191517k-@aws-0-eu-west-1.supabase.com:5432/postgres'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
