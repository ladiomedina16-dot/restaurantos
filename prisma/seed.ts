// ============================================================
// RestaurantOS — Database Seed
// SECURITY: All passwords read from environment variables.
// No hardcoded credentials anywhere in this file.
// If required env vars are missing, the seed ABORTS with a clear error.
// ============================================================

import 'dotenv/config'

import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

const hash = (pw: string) => bcrypt.hashSync(pw, 12)

// ─── Read passwords from environment ────────────────────────
// These MUST be set before running the seed.
// If any is missing, the seed aborts immediately.

const SEED_SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD
const SEED_ADMIN_PASSWORD      = process.env.SEED_ADMIN_PASSWORD
const SEED_STAFF_PASSWORD      = process.env.SEED_STAFF_PASSWORD

function validateSeedEnv() {
  const missing: string[] = []
  if (!SEED_SUPERADMIN_PASSWORD) missing.push('SEED_SUPERADMIN_PASSWORD')
  if (!SEED_ADMIN_PASSWORD)      missing.push('SEED_ADMIN_PASSWORD')
  if (!SEED_STAFF_PASSWORD)      missing.push('SEED_STAFF_PASSWORD')

  if (missing.length > 0) {
    console.error('\n' + '═'.repeat(60))
    console.error('❌  SEED ABORTED — Missing required environment variables:')
    console.error('═'.repeat(60))
    for (const v of missing) {
      console.error(`   • ${v}`)
    }
    console.error('\n   Set them before running the seed:')
    console.error('   export SEED_SUPERADMIN_PASSWORD="<your-secure-password>"')
    console.error('   export SEED_ADMIN_PASSWORD="<your-secure-password>"')
    console.error('   export SEED_STAFF_PASSWORD="<your-secure-password>"')
    console.error('\n   Or run in one line:')
    console.error('   SEED_SUPERADMIN_PASSWORD="..." SEED_ADMIN_PASSWORD="..." SEED_STAFF_PASSWORD="..." bunx tsx prisma/seed.ts')
    console.error('═'.repeat(60) + '\n')
    process.exit(1)
  }

  // Warn if passwords are too short
  const check = (name: string, pw: string) => {
    if (pw.length < 8) {
      console.warn(`⚠️  ${name} is too short (${pw.length} chars). Use at least 12 characters.`)
    }
  }
  check('SEED_SUPERADMIN_PASSWORD', SEED_SUPERADMIN_PASSWORD!)
  check('SEED_ADMIN_PASSWORD', SEED_ADMIN_PASSWORD!)
  check('SEED_STAFF_PASSWORD', SEED_STAFF_PASSWORD!)
}

async function seed() {
  // Validate env vars BEFORE touching the database
  validateSeedEnv()

  console.log('🌱 Seeding RestaurantOS with real Sevillian data...\n')

  // ─── CLEAN SLATE: Delete existing data in correct order ────
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
  // RESTAURANT
  // ═══════════════════════════════════════════════════════════
  const restaurant = await db.restaurant.create({
    data: {
      name: 'La Carta de Sevilla',
      slug: 'la-carta-de-sevilla',
      address: 'Calle Betis 42, Triana, Sevilla',
      phone: '954 123 456',
      subscriptionStatus: 'active',
      active: true,
    },
  })
  const r1 = restaurant.id
  console.log(`✅ Restaurante: ${restaurant.name} (${restaurant.slug})`)

  // ═══════════════════════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════════════════════
  // ⚠️  All users are created with mustChangePassword: true
  // They MUST change their password on first login.
  // Passwords are read from environment variables — NEVER printed.

  const userDefs = [
    // super_admin: acceso total, sin restaurante (ve todo)
    {
      username: 'superadmin',
      passwordHash: hash(SEED_SUPERADMIN_PASSWORD!),
      name: 'Super Administrador',
      role: 'super_admin',
      active: true,
      mustChangePassword: true,
      zone: null,
      restaurantId: null,
    },
    // admin: creado por super_admin al hacer onboarding
    {
      username: 'admin',
      passwordHash: hash(SEED_ADMIN_PASSWORD!),
      name: 'Antonio Reyes — Administrador',
      role: 'admin',
      active: true,
      mustChangePassword: true,
      zone: null,
      restaurantId: r1,
    },
    // Camareros con zona asignada
    {
      username: 'camarero_terraza',
      passwordHash: hash(SEED_STAFF_PASSWORD!),
      name: 'María Solís — Camarera Terraza',
      role: 'camarero',
      active: true,
      mustChangePassword: true,
      zone: 'terrace',
      restaurantId: r1,
    },
    {
      username: 'camarero_sala',
      passwordHash: hash(SEED_STAFF_PASSWORD!),
      name: 'Javier Moreno — Camarero Salón',
      role: 'camarero',
      active: true,
      mustChangePassword: true,
      zone: 'main',
      restaurantId: r1,
    },
    {
      username: 'camarero_barra',
      passwordHash: hash(SEED_STAFF_PASSWORD!),
      name: 'Lucía Prieto — Camarera Barra',
      role: 'camarero',
      active: true,
      mustChangePassword: true,
      zone: 'bar',
      restaurantId: r1,
    },
    // Cocina
    {
      username: 'cocinero',
      passwordHash: hash(SEED_STAFF_PASSWORD!),
      name: 'Carlos Herrera — Cocinero Jefe',
      role: 'cocina',
      active: true,
      mustChangePassword: true,
      zone: null,
      restaurantId: r1,
    },
    // Encargado
    {
      username: 'encargado',
      passwordHash: hash(SEED_STAFF_PASSWORD!),
      name: 'Rosa Delgado — Encargada',
      role: 'encargado',
      active: true,
      mustChangePassword: true,
      zone: null,
      restaurantId: r1,
    },
    // Caja
    {
      username: 'caja',
      passwordHash: hash(SEED_STAFF_PASSWORD!),
      name: 'Pedro Naranjo — Caja',
      role: 'caja',
      active: true,
      mustChangePassword: true,
      zone: null,
      restaurantId: r1,
    },
  ]

  const users: Record<string, string> = {}
  for (const u of userDefs) {
    const user = await db.user.create({ data: u })
    users[u.username] = user.id
  }
  console.log(`✅ ${userDefs.length} usuarios creados`)

  // ═══════════════════════════════════════════════════════════
  // CARTA TRADICIONAL SEVILLANA
  // ═══════════════════════════════════════════════════════════

  // ── BEBIDAS ────────────────────────────────────────────────
  const bebidas = [
    { name: 'Caña de Cruzcampo', description: 'Cerveza rubia de barril, bien tirada', price: 1.50, category: 'bebida', stock: 300 },
    { name: 'Doble de Cruzcampo', description: 'Cerveza rubia doble de barril', price: 2.50, category: 'bebida', stock: 200 },
    { name: 'Copa de Manzanilla', description: 'Manzanilla sanluqueña en copa', price: 1.80, category: 'bebida', stock: 120 },
    { name: 'Copa de Fino', description: 'Fino de Jerez Tío Pepe', price: 1.80, category: 'bebida', stock: 120 },
    { name: 'Copa de Oloroso', description: 'Vino oloroso de Jerez', price: 2.20, category: 'bebida', stock: 80 },
    { name: 'Tinto de Verano', description: 'Vino tinto con casera y hielo', price: 2.50, category: 'bebida', stock: 100 },
    { name: 'Sangría Casera', description: 'Sangría de la casa con fruta', price: 3.50, category: 'bebida', stock: 60 },
    { name: 'Rebujito', description: 'Manzanilla con 7Up y menta', price: 3.00, category: 'bebida', stock: 80 },
    { name: 'Copa de Vino Tinto', description: 'Vino tinto de la tierra', price: 2.00, category: 'bebida', stock: 100 },
    { name: 'Copa de Vino Blanco', description: 'Vino blanco joven', price: 2.00, category: 'bebida', stock: 80 },
    { name: 'Refresco', description: 'Coca-Cola, Fanta, Sprite, Nestea', price: 2.00, category: 'bebida', stock: 200 },
    { name: 'Zumo Natural', description: 'Zumo de naranja recién exprimido', price: 2.50, category: 'bebida', stock: 50 },
    { name: 'Botella de Agua', description: 'Agua mineral 50cl', price: 1.50, category: 'bebida', stock: 150 },
    { name: 'Café', description: 'Café solo o con leche', price: 1.30, category: 'bebida', stock: 200 },
    { name: 'Carajillo', description: 'Café con brandy o ron', price: 2.00, category: 'bebida', stock: 100 },
  ]

  // ── TAPAS FRÍAS ────────────────────────────────────────────
  const tapasFrias = [
    { name: 'Ensaladilla Rusa', description: 'Ensaladilla casera con picos de Triana', price: 3.50, category: 'tapa_fria', stock: 40 },
    { name: 'Aliño de Papas con Melva', description: 'Papas aliñadas con melva canutera y cebolleta', price: 3.80, category: 'tapa_fria', stock: 35 },
    { name: 'Queso Viejo de Oveja', description: 'Queso curado de oveja con aceite de oliva virgen extra', price: 4.00, category: 'tapa_fria', stock: 30 },
    { name: 'Jamón Ibérico de Bellota (tapa)', description: 'Jamón ibérico de bellota cortado a cuchillo', price: 8.50, category: 'tapa_fria', stock: 20 },
    { name: 'Lomo Ibérico en Manteca', description: 'Lomo de cerdo ibérico en manteca colorá', price: 3.80, category: 'tapa_fria', stock: 30 },
    { name: 'Salmorejo', description: 'Salmorejo cordobés con huevo y jamón', price: 4.50, category: 'tapa_fria', stock: 35 },
    { name: 'Gazpacho Andaluz', description: 'Gazpacho fresco de tomate, pepino y pimiento', price: 3.50, category: 'tapa_fria', stock: 40 },
    { name: 'Ajoblanco', description: 'Sopa fría de almendras con uvas', price: 3.50, category: 'tapa_fria', stock: 25 },
  ]

  // ── TAPAS CALIENTES ────────────────────────────────────────
  const tapasCalientes = [
    { name: 'Solomillo al Whisky', description: 'Solomillo de cerdo flambéado al whisky', price: 4.50, category: 'tapa_caliente', stock: 30 },
    { name: 'Carrillada Ibérica al Vino Tinto', description: 'Carrillada estofada lentamente al vino tinto', price: 4.80, category: 'tapa_caliente', stock: 25 },
    { name: 'Espinacas con Garbanzos', description: 'Espinacas salteadas con garbanzos y comino', price: 4.00, category: 'tapa_caliente', stock: 35 },
    { name: 'Pavía de Bacalao', description: 'Bacalao rebozado frito crujiente', price: 3.50, category: 'tapa_caliente', stock: 30 },
    { name: 'Croqueta de Jamón Ibérico', description: 'Croqueta casera cremosa de jamón ibérico', price: 3.00, category: 'tapa_caliente', stock: 50 },
    { name: 'Tortilla de Patatas', description: 'Tortilla española jugosa, al punto', price: 3.50, category: 'tapa_caliente', stock: 40 },
    { name: 'Choco Frito', description: 'Chocos fritos con limón', price: 4.00, category: 'tapa_caliente', stock: 25 },
    { name: 'Huevos a la Flamenca', description: 'Huevos fritos sobre pisto con jamón y patatas', price: 4.50, category: 'tapa_caliente', stock: 20 },
    { name: 'Punta de Solomillo al Pedro Ximénez', description: 'Punta de solomillo con reducción de PX', price: 5.50, category: 'tapa_caliente', stock: 20 },
  ]

  // ── MONTADITOS ─────────────────────────────────────────────
  const montaditos = [
    { name: 'Montadito de Pringá', description: 'Pan de pueblo con pringá de cocido', price: 3.00, category: 'montadito', stock: 40 },
    { name: 'Serranito', description: 'Lomo, jamón serrano y pimiento frito en pan de mollas', price: 4.50, category: 'montadito', stock: 30 },
    { name: 'Piripi', description: 'Pan con pringá, jamón y huevo frito', price: 3.50, category: 'montadito', stock: 35 },
    { name: 'Montadito de Chicharrones', description: 'Chicharrones calientes en pan de Sevilla', price: 2.80, category: 'montadito', stock: 40 },
    { name: 'Cateto', description: 'Pan con jamón, queso y tomate rallado', price: 3.20, category: 'montadito', stock: 35 },
    { name: 'Montadito de Bacalao', description: 'Bacalao frito con alioli en pan', price: 3.50, category: 'montadito', stock: 30 },
  ]

  // ── RACIONES ───────────────────────────────────────────────
  const raciones = [
    { name: 'Ración de Adobo', description: 'Adobo de choco frito con limón', price: 9.00, category: 'racion', stock: 20 },
    { name: 'Ración de Croquetas Caseras', description: 'Croquetas de jamón ibérico (8 unidades)', price: 10.00, category: 'racion', stock: 20 },
    { name: 'Jamón Ibérico de Bellota (ración)', description: 'Jamón ibérico de bellota cortado a cuchillo, ración completa', price: 18.00, category: 'racion', stock: 15 },
    { name: 'Ración de Pescaíto Frito', description: 'Variado de pescaíto frito: chanquetes, boquerones, salmonetes', price: 12.00, category: 'racion', stock: 15 },
    { name: 'Ración de Gambas al Ajillo', description: 'Gambas en aceite de oliva con ajo laminado y guindilla', price: 11.00, category: 'racion', stock: 18 },
    { name: 'Ración de Solomillo al Whisky', description: 'Solomillo de cerdo flambéado al whisky con patatas', price: 14.00, category: 'racion', stock: 15 },
    { name: 'Arroz Meloso de Carrillada Ibérica', description: '★ ESPECIAL ★ Arroz meloso con carrillada ibérica deshecha y reducción de su jugo', price: 16.00, category: 'racion', stock: 12 },
    { name: 'Presa Ibérica con Salsa de Vino Oloroso', description: '★ ESPECIAL ★ Presa ibérica a la brasa con salsa de vino oloroso y patatas panaderas', price: 18.00, category: 'racion', stock: 10 },
  ]

  // ── POSTRES ────────────────────────────────────────────────
  const postres = [
    { name: 'Tocino de Cielo', description: 'Tocino de cielo de Jerez, dulce tradicional', price: 3.00, category: 'postre', stock: 25 },
    { name: 'Flan de Huevo Casero', description: 'Flan de huevo tradicional con caramelo', price: 3.00, category: 'postre', stock: 25 },
    { name: 'Arroz con Leche', description: 'Arroz con leche casero con canela', price: 3.50, category: 'postre', stock: 20 },
    { name: 'Torrijas', description: 'Torrija andaluza con miel y canela (temporada)', price: 3.50, category: 'postre', stock: 15 },
    { name: 'Queso con Membrillo', description: 'Queso manchego con dulce de membrillo', price: 4.00, category: 'postre', stock: 20 },
    { name: 'Helado de Nata y Canela', description: 'Helado artesanal de nata con canela de Sri Lanka', price: 3.50, category: 'postre', stock: 30 },
  ]

  // ── CREAR TODOS LOS PRODUCTOS ─────────────────────────────
  const allProducts = [
    ...bebidas.map(p => ({ ...p, restaurantId: r1 })),
    ...tapasFrias.map(p => ({ ...p, restaurantId: r1 })),
    ...tapasCalientes.map(p => ({ ...p, restaurantId: r1 })),
    ...montaditos.map(p => ({ ...p, restaurantId: r1 })),
    ...raciones.map(p => ({ ...p, restaurantId: r1 })),
    ...postres.map(p => ({ ...p, restaurantId: r1 })),
  ]

  let productCount = 0
  for (const pData of allProducts) {
    await db.product.create({ data: pData })
    productCount++
  }
  console.log(`✅ ${productCount} productos creados`)
  console.log(`   🍹 ${bebidas.length} bebidas`)
  console.log(`   🥗 ${tapasFrias.length} tapas frías`)
  console.log(`   🍳 ${tapasCalientes.length} tapas calientes`)
  console.log(`   🥪 ${montaditos.length} montaditos`)
  console.log(`   🍽️  ${raciones.length} raciones (incl. 2 especiales)`)
  console.log(`   🍰 ${postres.length} postres`)

  // ═══════════════════════════════════════════════════════════
  // MESAS POR ZONA
  // ═══════════════════════════════════════════════════════════
  const tablesData = [
    // Barra (6 mesas)
    ...Array.from({ length: 6 }, (_, i) => ({
      number: i + 1, capacity: 2, zone: 'bar' as const, restaurantId: r1,
    })),
    // Salón (14 mesas)
    ...Array.from({ length: 14 }, (_, i) => ({
      number: i + 11, capacity: 4, zone: 'main' as const, restaurantId: r1,
    })),
    // Terraza (14 mesas)
    ...Array.from({ length: 14 }, (_, i) => ({
      number: i + 31, capacity: 4, zone: 'terrace' as const, restaurantId: r1,
    })),
  ]

  let tableCount = 0
  for (const tData of tablesData) {
    await db.table.create({ data: tData })
    tableCount++
  }
  console.log(`✅ ${tableCount} mesas creadas`)
  console.log(`   🪑 Barra: 6 mesas (1-6)`)
  console.log(`   🪑 Salón: 14 mesas (11-24)`)
  console.log(`   🪑 Terraza: 14 mesas (31-44)`)

  // ═══════════════════════════════════════════════════════════
  // CLIENTES DE EJEMPLO (CRM)
  // ═══════════════════════════════════════════════════════════
  const clientsData = [
    { name: 'Antonio Fernández García', phone: '654 123 456', email: 'antonio.fg@email.com', points: 45, visits: 12 },
    { name: 'María del Carmen Ruiz Torres', phone: '666 789 012', email: 'mariacarmen.rt@email.com', points: 120, visits: 28 },
    { name: 'José Manuel García Vega', phone: '678 345 678', email: 'josema.gv@email.com', points: 8, visits: 3 },
    { name: 'Isabel Pardo Molina', phone: '612 987 654', email: 'isabel.pm@email.com', points: 65, visits: 16 },
    { name: 'Francisco Javier León Soto', phone: '699 111 222', email: 'franjavier.ls@email.com', points: 200, visits: 42 },
  ]

  const clients = []
  for (const c of clientsData) {
    const client = await db.client.create({
      data: { ...c, restaurantId: r1 },
    })
    clients.push(client)
  }
  console.log(`✅ ${clients.length} clientes de ejemplo creados`)

  // ═══════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60))
  console.log('🎉  SEED COMPLETADO — RestaurantOS')
  console.log('═'.repeat(60))
  console.log(`\n  📍 Restaurante: ${restaurant.name}`)
  console.log(`     ${restaurant.address}`)
  console.log(`     Tel: ${restaurant.phone}\n`)
  console.log('  🔑 USUARIOS CREADOS (deben cambiar contraseña en el primer login):')
  console.log('  ─────────────────────────────────────────────')
  console.log('  👑 super_admin      │ user: superadmin')
  console.log('  🏢 admin            │ user: admin')
  console.log('  🍽️  camarero_terraza │ user: camarero_terraza')
  console.log('  🍽️  camarero_sala    │ user: camarero_sala')
  console.log('  🍽️  camarero_barra   │ user: camarero_barra')
  console.log('  👨‍🍳 cocinero          │ user: cocinero')
  console.log('  📊 encargado         │ user: encargado')
  console.log('  💰 caja              │ user: caja')
  console.log('  ─────────────────────────────────────────────')
  console.log('\n  ⚠️  Las contraseñas iniciales NO se muestran por seguridad.')
  console.log('     Fueron definidas mediante variables de entorno.')
  console.log('     TODOS los usuarios deben cambiar contraseña en el primer login.')
  console.log('\n  📋 PERMISOS POR ZONA:')
  console.log('  ─────────────────────────────────────────────')
  console.log('  camarero_terraza → Solo TERRAZA (mesas 31-44)')
  console.log('  camarero_sala    → Solo SALÓN (mesas 11-24)')
  console.log('  camarero_barra   → Solo BARRA (mesas 1-6)')
  console.log('  cocinero         → Cocina/KDS (todos los pedidos)')
  console.log('  encargado        → Reportes, Caja, Usuarios, Auditoría')
  console.log('  caja             → Cobros y sesiones de caja')
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
