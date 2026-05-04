// ============================================================
// RestaurantOS — Database Seed (CLEAN — no demo data)
// Creates ONLY: super_admin user
// Restaurants, admins, staff, products → created via the app
// Password read from SEED_SUPERADMIN_PASSWORD env var
// ============================================================

// Load .env BEFORE any other imports
import 'dotenv/config'

// Fix: System env may override DATABASE_URL with SQLite.
// If the URL starts with "file:", override it with the PostgreSQL URL from .env.
import { readFileSync } from 'fs'
import { resolve } from 'path'

if (process.env.DATABASE_URL?.startsWith('file:')) {
  try {
    const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    const pgUrlMatch = envContent.match(/^DATABASE_URL="?(postgresql:\/\/[^"\n]+)"?/m)
    if (pgUrlMatch) {
      process.env.DATABASE_URL = pgUrlMatch[1]
      console.log('📋 Overrode SQLite DATABASE_URL with PostgreSQL from .env')
    }
  } catch { /* ignore */ }
}
if (process.env.DIRECT_URL?.startsWith('file:')) {
  try {
    const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    const pgUrlMatch = envContent.match(/^DIRECT_URL="?(postgresql:\/\/[^"\n]+)"?/m)
    if (pgUrlMatch) {
      process.env.DIRECT_URL = pgUrlMatch[1]
    }
  } catch { /* ignore */ }
}

// ─── Validate seed env var FIRST ─────────────────────────────

const SEED_SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD

function validateSeedEnv() {
  if (!SEED_SUPERADMIN_PASSWORD) {
    console.error('\n' + '═'.repeat(60))
    console.error('❌  SEED ABORTED — Missing required environment variable:')
    console.error('═'.repeat(60))
    console.error('   • SEED_SUPERADMIN_PASSWORD')
    console.error('\n   Set it in .env or Vercel Environment Variables, then run:')
    console.error('   bunx tsx prisma/seed.ts')
    console.error('═'.repeat(60) + '\n')
    process.exit(1)
  }

  if (SEED_SUPERADMIN_PASSWORD.length < 6) {
    console.warn(`⚠️  SEED_SUPERADMIN_PASSWORD is too short (${SEED_SUPERADMIN_PASSWORD.length} chars). Use at least 8 characters.`)
  }
}

validateSeedEnv()

import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

const hash = (pw: string) => bcrypt.hashSync(pw, 12)

// Re-export BASE_PRODUCTS for onboarding to import
export { BASE_PRODUCTS } from '../src/lib/base-products'

async function seed() {
  console.log('🌱 Seeding RestaurantOS (clean — no demo data)...\n')

  // ─── CLEAN SLATE: Delete ALL existing data ──────────────────
  console.log('🧹 Cleaning existing data...')
  await db.auditLog.deleteMany()
  await db.payment.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.cashSession.deleteMany()
  await db.client.deleteMany()
  await db.table.deleteMany()
  await db.product.deleteMany()
  await db.user.deleteMany()
  await db.restaurant.deleteMany()
  console.log('✅ Database cleared\n')

  // ═══════════════════════════════════════════════════════════
  // SUPER_ADMIN USER (only user created by seed)
  // username: superadmin
  // password: from SEED_SUPERADMIN_PASSWORD env var
  // ═══════════════════════════════════════════════════════════
  await db.user.create({
    data: {
      username: 'superadmin',
      passwordHash: hash(SEED_SUPERADMIN_PASSWORD!),
      name: 'Super Administrador',
      role: 'super_admin',
      active: true,
      mustChangePassword: false,
      zone: null,
      restaurantId: null,
    },
  })
  console.log('✅ super_admin user created')

  // ═══════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60))
  console.log('🎉  SEED COMPLETADO — RestaurantOS')
  console.log('═'.repeat(60))
  console.log('\n  👑 super_admin │ user: superadmin')
  console.log('     password: (from SEED_SUPERADMIN_PASSWORD env var)')
  console.log('\n  📋 No restaurants, admins, or demo data created.')
  console.log('     Use the app to onboard new restaurants.')
  console.log('═'.repeat(60))
}

seed()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
