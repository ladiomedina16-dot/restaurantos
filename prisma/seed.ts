import { db } from '../src/lib/db'

async function seed() {
  console.log('🌱 Seeding database with La Carta de Sevilla...')

  // ─── PRODUCTOS: BEBIDAS ────────────────────────
  const bebidas = await Promise.all([
    db.product.create({ data: { name: 'Caña de Cruzcampo', description: 'Cerveza rubia de barril', price: 1.50, category: 'bebida', stock: 200 } }),
    db.product.create({ data: { name: 'Copa de Manzanilla', description: 'Manzanilla sanluqueña', price: 1.80, category: 'bebida', stock: 100 } }),
    db.product.create({ data: { name: 'Tinto de Verano', description: 'Vino tinto con casera y hielo', price: 2.50, category: 'bebida', stock: 80 } }),
    db.product.create({ data: { name: 'Refresco', description: 'Coca-Cola, Fanta, Sprite', price: 2.00, category: 'bebida', stock: 150 } }),
    db.product.create({ data: { name: 'Botella de Agua', description: 'Agua mineral 50cl', price: 1.50, category: 'bebida', stock: 120 } }),
  ])

  // ─── PRODUCTOS: TAPAS FRÍAS ────────────────────
  const tapasFrias = await Promise.all([
    db.product.create({ data: { name: 'Ensaladilla Rusa con picos de Triana', description: 'Ensaladilla casera con picos crujientes', price: 3.50, category: 'tapa_fria', stock: 40 } }),
    db.product.create({ data: { name: 'Aliño de Papas con Melva', description: 'Papas aliñadas con melva canutera', price: 3.80, category: 'tapa_fria', stock: 35 } }),
    db.product.create({ data: { name: 'Queso Viejo de Oveja', description: 'Queso curado de oveja con aceite', price: 4.00, category: 'tapa_fria', stock: 30 } }),
  ])

  // ─── PRODUCTOS: TAPAS CALIENTES ────────────────
  const tapasCalientes = await Promise.all([
    db.product.create({ data: { name: 'Solomillo al Whisky', description: 'Solomillo de cerdo flambéado al whisky', price: 4.50, category: 'tapa_caliente', stock: 30 } }),
    db.product.create({ data: { name: 'Carrillada Ibérica al vino tinto', description: 'Carrillada estofada lentamente', price: 4.80, category: 'tapa_caliente', stock: 25 } }),
    db.product.create({ data: { name: 'Espinacas con Garbanzos', description: 'Espinacas salteadas con garbanzos y comino', price: 4.00, category: 'tapa_caliente', stock: 35 } }),
    db.product.create({ data: { name: 'Pavía de Bacalao', description: 'Bacalao rebozado frito crujiente', price: 3.50, category: 'tapa_caliente', stock: 30 } }),
  ])

  // ─── PRODUCTOS: MONTADITOS ─────────────────────
  const montaditos = await Promise.all([
    db.product.create({ data: { name: 'Montadito de Pringá', description: 'Pan con pringá de cocido', price: 3.00, category: 'montadito', stock: 40 } }),
    db.product.create({ data: { name: 'Serranito de lomo y jamón', description: 'Lomo, jamón serrano y pimiento frito', price: 4.50, category: 'montadito', stock: 30 } }),
    db.product.create({ data: { name: 'Piripi', description: 'Pan con pringá, jamón y huevo', price: 3.50, category: 'montadito', stock: 35 } }),
  ])

  // ─── PRODUCTOS: RACIONES ───────────────────────
  const raciones = await Promise.all([
    db.product.create({ data: { name: 'Ración de Adobo', description: 'Adobo de choco frito', price: 9.00, category: 'racion', stock: 20 } }),
    db.product.create({ data: { name: 'Ración de Croquetas Caseras', description: 'Croquetas de jamón ibérico', price: 10.00, category: 'racion', stock: 20 } }),
    db.product.create({ data: { name: 'Jamón Ibérico de Bellota', description: 'Jamón ibérico de bellota cortado a cuchillo', price: 18.00, category: 'racion', stock: 15 } }),
  ])

  const allProducts = [...bebidas, ...tapasFrias, ...tapasCalientes, ...montaditos, ...raciones]
  console.log(`✅ ${allProducts.length} productos creados`)

  // ─── MESAS POR ZONA ────────────────────────────
  const tables = []

  // Barra (mesas 1-5)
  for (let i = 1; i <= 5; i++) {
    tables.push(await db.table.create({ data: { number: i, capacity: 2, zone: 'bar' } }))
  }

  // Salón (mesas 6-15)
  for (let i = 6; i <= 15; i++) {
    tables.push(await db.table.create({ data: { number: i, capacity: 4, zone: 'main' } }))
  }

  // Terraza (mesas 16-25)
  for (let i = 16; i <= 25; i++) {
    tables.push(await db.table.create({ data: { number: i, capacity: 4, zone: 'terrace' } }))
  }

  console.log(`✅ ${tables.length} mesas creadas (5 barra, 10 salón, 10 terraza)`)

  // ─── CLIENTES DE EJEMPLO (CRM) ─────────────────
  const clients = await Promise.all([
    db.client.create({ data: { name: 'Antonio Fernández', phone: '654123456', email: 'antonio@email.com', points: 45, visits: 12 } }),
    db.client.create({ data: { name: 'María del Carmen Ruiz', phone: '666789012', email: 'mariacarmen@email.com', points: 120, visits: 28 } }),
    db.client.create({ data: { name: 'José Manuel García', phone: '678345678', email: 'josema@email.com', points: 8, visits: 3 } }),
  ])

  console.log(`✅ ${clients.length} clientes de ejemplo creados`)

  // ─── SUPER ADMIN ───────────────────────────────
  const existingAdmin = await db.admin.findFirst()
  if (!existingAdmin) {
    await db.admin.create({ data: { username: 'admin', passwordHash: 'admin123', role: 'super_admin' } })
    console.log('✅ Super admin creado (admin / admin123)')
  } else {
    console.log('⏭️ Super admin ya existe')
  }

  console.log('\n🎉 Seed completado. ¡La Carta de Sevilla está lista!')
  console.log(`   ${allProducts.length} productos | ${tables.length} mesas | ${clients.length} clientes`)
}

seed()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
