// Load .env before any other imports (ESM hoisting safe)
import 'dotenv/config'

import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

const hash = (pw: string) => bcrypt.hashSync(pw, 12)

async function seed() {
  console.log('🌱 Seeding database with multi-restaurant data...')

  // ─── RESTAURANTS ────────────────────────────────────────
  const restaurants = await Promise.all([
    db.restaurant.upsert({
      where: { slug: 'la-carta-de-sevilla' },
      update: { name: 'La Carta de Sevilla', address: 'Calle Betis 42, Sevilla', phone: '954123456' },
      create: { name: 'La Carta de Sevilla', slug: 'la-carta-de-sevilla', address: 'Calle Betis 42, Sevilla', phone: '954123456' },
    }),
    db.restaurant.upsert({
      where: { slug: 'taberna-del-puerto' },
      update: { name: 'Taberna del Puerto', address: 'Muelle de las Delicias 8, Sevilla', phone: '954789012' },
      create: { name: 'Taberna del Puerto', slug: 'taberna-del-puerto', address: 'Muelle de las Delicias 8, Sevilla', phone: '954789012' },
    }),
  ])
  console.log(`✅ ${restaurants.length} restaurantes creados`)

  const r1 = restaurants[0].id
  const r2 = restaurants[1].id

  // ─── USUARIOS (upsert para idempotencia) ───────
  const userDefs = [
    // super_admin: no restaurantId (can see all)
    { username: 'superadmin', passwordHash: hash('Sup3rAdm1n!2024'), name: 'Super Administrador', role: 'super_admin', restaurantId: null },
    // Restaurant 1 users
    { username: 'admin', passwordHash: hash('Adm1n!2024'), name: 'Administrador', role: 'admin', restaurantId: r1 },
    { username: 'encargado', passwordHash: hash('Enc4rg4d0!2024'), name: 'Encargado', role: 'encargado', restaurantId: r1 },
    { username: 'camarero1', passwordHash: hash('C4m4r3r0!2024'), name: 'Camarero 1', role: 'camarero', restaurantId: r1 },
    { username: 'camarero2', passwordHash: hash('C4m4r3r0!2024'), name: 'Camarero 2', role: 'camarero', restaurantId: r1 },
    { username: 'cocina1', passwordHash: hash('C0c1n4!2024'), name: 'Cocina 1', role: 'cocina', restaurantId: r1 },
    { username: 'caja1', passwordHash: hash('C4j4!2024'), name: 'Caja 1', role: 'caja', restaurantId: r1 },
    // Restaurant 2 users
    { username: 'admin2', passwordHash: hash('Adm1n2!2024'), name: 'Administrador R2', role: 'admin', restaurantId: r2 },
    { username: 'camarero3', passwordHash: hash('C4m4r3r0!2024'), name: 'Camarero R2', role: 'camarero', restaurantId: r2 },
    { username: 'cocina2', passwordHash: hash('C0c1n4!2024'), name: 'Cocina R2', role: 'cocina', restaurantId: r2 },
    { username: 'caja2', passwordHash: hash('C4j4!2024'), name: 'Caja R2', role: 'caja', restaurantId: r2 },
  ]

  const users = []
  for (const u of userDefs) {
    const user = await db.user.upsert({
      where: { username: u.username },
      update: { passwordHash: u.passwordHash, name: u.name, role: u.role, restaurantId: u.restaurantId },
      create: u as any,
    })
    users.push(user)
  }
  console.log(`✅ ${users.length} usuarios creados/actualizados`)

  // ─── PRODUCTOS: RESTAURANT 1 (La Carta de Sevilla) ──────
  const bebidasData = [
    { name: 'Caña de Cruzcampo', description: 'Cerveza rubia de barril', price: 1.50, category: 'bebida', stock: 200, restaurantId: r1 },
    { name: 'Copa de Manzanilla', description: 'Manzanilla sanluqueña', price: 1.80, category: 'bebida', stock: 100, restaurantId: r1 },
    { name: 'Tinto de Verano', description: 'Vino tinto con casera y hielo', price: 2.50, category: 'bebida', stock: 80, restaurantId: r1 },
    { name: 'Refresco', description: 'Coca-Cola, Fanta, Sprite', price: 2.00, category: 'bebida', stock: 150, restaurantId: r1 },
    { name: 'Botella de Agua', description: 'Agua mineral 50cl', price: 1.50, category: 'bebida', stock: 120, restaurantId: r1 },
  ]

  const tapasFriasData = [
    { name: 'Ensaladilla Rusa con picos de Triana', description: 'Ensaladilla casera con picos crujientes', price: 3.50, category: 'tapa_fria', stock: 40, restaurantId: r1 },
    { name: 'Aliño de Papas con Melva', description: 'Papas aliñadas con melva canutera', price: 3.80, category: 'tapa_fria', stock: 35, restaurantId: r1 },
    { name: 'Queso Viejo de Oveja', description: 'Queso curado de oveja con aceite', price: 4.00, category: 'tapa_fria', stock: 30, restaurantId: r1 },
  ]

  const tapasCalientesData = [
    { name: 'Solomillo al Whisky', description: 'Solomillo de cerdo flambéado al whisky', price: 4.50, category: 'tapa_caliente', stock: 30, restaurantId: r1 },
    { name: 'Carrillada Ibérica al vino tinto', description: 'Carrillada estofada lentamente', price: 4.80, category: 'tapa_caliente', stock: 25, restaurantId: r1 },
    { name: 'Espinacas con Garbanzos', description: 'Espinacas salteadas con garbanzos y comino', price: 4.00, category: 'tapa_caliente', stock: 35, restaurantId: r1 },
    { name: 'Pavía de Bacalao', description: 'Bacalao rebozado frito crujiente', price: 3.50, category: 'tapa_caliente', stock: 30, restaurantId: r1 },
  ]

  const montaditosData = [
    { name: 'Montadito de Pringá', description: 'Pan con pringá de cocido', price: 3.00, category: 'montadito', stock: 40, restaurantId: r1 },
    { name: 'Serranito de lomo y jamón', description: 'Lomo, jamón serrano y pimiento frito', price: 4.50, category: 'montadito', stock: 30, restaurantId: r1 },
    { name: 'Piripi', description: 'Pan con pringá, jamón y huevo', price: 3.50, category: 'montadito', stock: 35, restaurantId: r1 },
  ]

  const racionesData = [
    { name: 'Ración de Adobo', description: 'Adobo de choco frito', price: 9.00, category: 'racion', stock: 20, restaurantId: r1 },
    { name: 'Ración de Croquetas Caseras', description: 'Croquetas de jamón ibérico', price: 10.00, category: 'racion', stock: 20, restaurantId: r1 },
    { name: 'Jamón Ibérico de Bellota', description: 'Jamón ibérico de bellota cortado a cuchillo', price: 18.00, category: 'racion', stock: 15, restaurantId: r1 },
  ]

  // ─── PRODUCTOS: RESTAURANT 2 (Taberna del Puerto) ──────
  const bebidasR2 = [
    { name: 'Caña de Cruzcampo', description: 'Cerveza rubia de barril', price: 1.60, category: 'bebida', stock: 150, restaurantId: r2 },
    { name: 'Copa de Vino Fino', description: 'Fino de Jerez', price: 2.00, category: 'bebida', stock: 80, restaurantId: r2 },
    { name: 'Refresco', description: 'Coca-Cola, Fanta, Sprite', price: 2.20, category: 'bebida', stock: 100, restaurantId: r2 },
  ]

  const tapasCalientesR2 = [
    { name: 'Pescaíto Frito', description: 'Variado de pescado frito', price: 6.00, category: 'tapa_caliente', stock: 30, restaurantId: r2 },
    { name: 'Gambas al Ajillo', description: 'Gambas en aceite de oliva con ajo', price: 5.50, category: 'tapa_caliente', stock: 25, restaurantId: r2 },
  ]

  const allProductData = [
    ...bebidasData, ...tapasFriasData, ...tapasCalientesData,
    ...montaditosData, ...racionesData,
    ...bebidasR2, ...tapasCalientesR2,
  ]

  let productCount = 0
  for (const pData of allProductData) {
    try {
      await db.product.create({ data: pData })
      productCount++
    } catch { /* skip if exists */ }
  }
  console.log(`✅ ${productCount} productos creados`)

  // ─── MESAS POR ZONA - Restaurant 1 ─────────────────────
  let tableCount = 0
  for (let i = 1; i <= 25; i++) {
    try {
      const zone = i <= 5 ? 'bar' : i <= 15 ? 'main' : 'terrace'
      const capacity = i <= 5 ? 2 : 4
      await db.table.create({ data: { number: i, capacity, zone, restaurantId: r1 } })
      tableCount++
    } catch { /* skip if exists */ }
  }

  // ─── MESAS POR ZONA - Restaurant 2 ─────────────────────
  for (let i = 1; i <= 15; i++) {
    try {
      const zone = i <= 5 ? 'bar' : i <= 10 ? 'main' : 'terrace'
      const capacity = i <= 5 ? 2 : 4
      await db.table.create({ data: { number: i, capacity, zone, restaurantId: r2 } })
      tableCount++
    } catch { /* skip if exists */ }
  }
  console.log(`✅ ${tableCount} mesas creadas`)

  // ─── CLIENTES DE EJEMPLO (CRM) - Restaurant 1 ──────────
  const clientsData = [
    { name: 'Antonio Fernández', phone: '654123456', email: 'antonio@email.com', points: 45, visits: 12, restaurantId: r1 },
    { name: 'María del Carmen Ruiz', phone: '666789012', email: 'mariacarmen@email.com', points: 120, visits: 28, restaurantId: r1 },
    { name: 'José Manuel García', phone: '678345678', email: 'josema@email.com', points: 8, visits: 3, restaurantId: r1 },
  ]
  const clients = await Promise.all(
    clientsData.map(c => db.client.upsert({
      where: { phone_restaurantId: { phone: c.phone, restaurantId: c.restaurantId } },
      update: { name: c.name, email: c.email, points: c.points, visits: c.visits },
      create: c,
    }))
  )

  // ─── CLIENTES DE EJEMPLO (CRM) - Restaurant 2 ──────────
  const clientsR2 = [
    { name: 'Pedro López', phone: '612345678', email: 'pedro@email.com', points: 20, visits: 5, restaurantId: r2 },
    { name: 'Laura Martín', phone: '698765432', email: 'laura@email.com', points: 75, visits: 15, restaurantId: r2 },
  ]
  const clients2 = await Promise.all(
    clientsR2.map(c => db.client.upsert({
      where: { phone_restaurantId: { phone: c.phone, restaurantId: c.restaurantId } },
      update: { name: c.name, email: c.email, points: c.points, visits: c.visits },
      create: c,
    }))
  )
  console.log(`✅ ${clients.length + clients2.length} clientes de ejemplo creados`)

  console.log('\n🎉 Seed completado. Multi-restaurante listo!')
  console.log(`   ${restaurants.length} restaurantes | ${users.length} usuarios | ${productCount} productos | ${tableCount} mesas | ${clients.length + clients2.length} clientes`)
  console.log(`\n   Restaurant 1: ${restaurants[0].name} (slug: ${restaurants[0].slug})`)
  console.log(`   Restaurant 2: ${restaurants[1].name} (slug: ${restaurants[1].slug})`)
}

seed()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
