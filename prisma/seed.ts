import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

const hash = (pw: string) => bcrypt.hashSync(pw, 12)

async function seed() {
  console.log('🌱 Seeding database with La Carta de Sevilla...')

  // ─── USUARIOS (upsert para idempotencia) ───────
  const userDefs = [
    { username: 'superadmin', passwordHash: hash('Sup3rAdm1n!2024'), name: 'Super Administrador', role: 'super_admin' },
    { username: 'admin', passwordHash: hash('Adm1n!2024'), name: 'Administrador', role: 'admin' },
    { username: 'encargado', passwordHash: hash('Enc4rg4d0!2024'), name: 'Encargado', role: 'encargado' },
    { username: 'camarero1', passwordHash: hash('C4m4r3r0!2024'), name: 'Camarero 1', role: 'camarero' },
    { username: 'camarero2', passwordHash: hash('C4m4r3r0!2024'), name: 'Camarero 2', role: 'camarero' },
    { username: 'cocina1', passwordHash: hash('C0c1n4!2024'), name: 'Cocina 1', role: 'cocina' },
    { username: 'caja1', passwordHash: hash('C4j4!2024'), name: 'Caja 1', role: 'caja' },
  ]
  const users = await Promise.all(
    userDefs.map(u => db.user.upsert({
      where: { username: u.username },
      update: { passwordHash: u.passwordHash, name: u.name, role: u.role },
      create: u,
    }))
  )
  console.log(`✅ ${users.length} usuarios creados/actualizados`)

  // ─── PRODUCTOS: BEBIDAS ────────────────────────
  const bebidasData = [
    { name: 'Caña de Cruzcampo', description: 'Cerveza rubia de barril', price: 1.50, category: 'bebida', stock: 200 },
    { name: 'Copa de Manzanilla', description: 'Manzanilla sanluqueña', price: 1.80, category: 'bebida', stock: 100 },
    { name: 'Tinto de Verano', description: 'Vino tinto con casera y hielo', price: 2.50, category: 'bebida', stock: 80 },
    { name: 'Refresco', description: 'Coca-Cola, Fanta, Sprite', price: 2.00, category: 'bebida', stock: 150 },
    { name: 'Botella de Agua', description: 'Agua mineral 50cl', price: 1.50, category: 'bebida', stock: 120 },
  ]

  // ─── PRODUCTOS: TAPAS FRÍAS ────────────────────
  const tapasFriasData = [
    { name: 'Ensaladilla Rusa con picos de Triana', description: 'Ensaladilla casera con picos crujientes', price: 3.50, category: 'tapa_fria', stock: 40 },
    { name: 'Aliño de Papas con Melva', description: 'Papas aliñadas con melva canutera', price: 3.80, category: 'tapa_fria', stock: 35 },
    { name: 'Queso Viejo de Oveja', description: 'Queso curado de oveja con aceite', price: 4.00, category: 'tapa_fria', stock: 30 },
  ]

  // ─── PRODUCTOS: TAPAS CALIENTES ────────────────
  const tapasCalientesData = [
    { name: 'Solomillo al Whisky', description: 'Solomillo de cerdo flambéado al whisky', price: 4.50, category: 'tapa_caliente', stock: 30 },
    { name: 'Carrillada Ibérica al vino tinto', description: 'Carrillada estofada lentamente', price: 4.80, category: 'tapa_caliente', stock: 25 },
    { name: 'Espinacas con Garbanzos', description: 'Espinacas salteadas con garbanzos y comino', price: 4.00, category: 'tapa_caliente', stock: 35 },
    { name: 'Pavía de Bacalao', description: 'Bacalao rebozado frito crujiente', price: 3.50, category: 'tapa_caliente', stock: 30 },
  ]

  // ─── PRODUCTOS: MONTADITOS ─────────────────────
  const montaditosData = [
    { name: 'Montadito de Pringá', description: 'Pan con pringá de cocido', price: 3.00, category: 'montadito', stock: 40 },
    { name: 'Serranito de lomo y jamón', description: 'Lomo, jamón serrano y pimiento frito', price: 4.50, category: 'montadito', stock: 30 },
    { name: 'Piripi', description: 'Pan con pringá, jamón y huevo', price: 3.50, category: 'montadito', stock: 35 },
  ]

  // ─── PRODUCTOS: RACIONES ───────────────────────
  const racionesData = [
    { name: 'Ración de Adobo', description: 'Adobo de choco frito', price: 9.00, category: 'racion', stock: 20 },
    { name: 'Ración de Croquetas Caseras', description: 'Croquetas de jamón ibérico', price: 10.00, category: 'racion', stock: 20 },
    { name: 'Jamón Ibérico de Bellota', description: 'Jamón ibérico de bellota cortado a cuchillo', price: 18.00, category: 'racion', stock: 15 },
  ]

  const allProductData = [...bebidasData, ...tapasFriasData, ...tapasCalientesData, ...montaditosData, ...racionesData]
  let productCount = 0
  for (const pData of allProductData) {
    try {
      await db.product.create({ data: pData })
      productCount++
    } catch { /* skip if exists */ }
  }
  console.log(`✅ ${productCount} productos creados`)

  // ─── MESAS POR ZONA ────────────────────────────
  let tableCount = 0
  for (let i = 1; i <= 25; i++) {
    try {
      const zone = i <= 5 ? 'bar' : i <= 15 ? 'main' : 'terrace'
      const capacity = i <= 5 ? 2 : 4
      await db.table.create({ data: { number: i, capacity, zone } })
      tableCount++
    } catch { /* skip if exists */ }
  }
  console.log(`✅ ${tableCount} mesas creadas`)

  // ─── CLIENTES DE EJEMPLO (CRM) ─────────────────
  const clientsData = [
    { name: 'Antonio Fernández', phone: '654123456', email: 'antonio@email.com', points: 45, visits: 12 },
    { name: 'María del Carmen Ruiz', phone: '666789012', email: 'mariacarmen@email.com', points: 120, visits: 28 },
    { name: 'José Manuel García', phone: '678345678', email: 'josema@email.com', points: 8, visits: 3 },
  ]
  const clients = await Promise.all(
    clientsData.map(c => db.client.upsert({
      where: { phone: c.phone },
      update: { name: c.name, email: c.email, points: c.points, visits: c.visits },
      create: c,
    }))
  )
  console.log(`✅ ${clients.length} clientes de ejemplo creados`)

  console.log('\n🎉 Seed completado. ¡La Carta de Sevilla está lista!')
  console.log(`   ${users.length} usuarios | ${productCount} productos | ${tableCount} mesas | ${clients.length} clientes`)
}

seed()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
