// ============================================================
// Database client — Prisma
// FIX: Sandbox overrides DATABASE_URL with SQLite at runtime.
// This module reads the correct PostgreSQL URL from .env file
// and sets it BEFORE PrismaClient is instantiated.
// On Vercel/production, DATABASE_URL is already PostgreSQL.
// ============================================================

import { readFileSync } from 'fs'
import { join } from 'path'

// ─── Force correct DATABASE_URL before PrismaClient import ───
if (process.env.DATABASE_URL?.startsWith('file:')) {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env'), 'utf8')
    const pgUrlMatch = envContent.match(/^DATABASE_URL="?(postgresql:\/\/[^"\n]+)"?/m)
    if (pgUrlMatch) {
      process.env.DATABASE_URL = pgUrlMatch[1]
    }
  } catch { /* ignore */ }
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

// NOW import PrismaClient after the env vars are fixed
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
