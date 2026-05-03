import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fix: System env may have a stale SQLite DATABASE_URL from initial setup.
// If the URL starts with "file:", read the correct PostgreSQL URL from .env file.
// This is needed because dotenv doesn't override existing environment variables.
if (process.env.DATABASE_URL?.startsWith('file:')) {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env'), 'utf8')
    const pgUrlMatch = envContent.match(/^DATABASE_URL="?(postgresql:\/\/[^"\n]+)"?/m)
    if (pgUrlMatch) {
      process.env.DATABASE_URL = pgUrlMatch[1]
    }
  } catch { /* ignore - will fail at query time if URL is wrong */ }
}
if (process.env.DIRECT_URL?.startsWith('file:')) {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env'), 'utf8')
    const pgUrlMatch = envContent.match(/^DIRECT_URL="?(postgresql:\/\/[^"\n]+)"?/m)
    if (pgUrlMatch) {
      process.env.DIRECT_URL = pgUrlMatch[1]
    }
  } catch { /* ignore */ }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
