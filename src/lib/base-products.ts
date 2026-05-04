// ============================================================
// BASE_PRODUCTS — Carta base sevillana
// Se usa desde seed.ts y desde onboarding para copiar
// productos a un nuevo restaurante.
// ============================================================

export interface BaseProduct {
  name: string
  description: string
  price: number
  category: string
  stock: number
}

export const BASE_PRODUCTS: BaseProduct[] = [
  // ── BEBIDAS ────────────────────────────────────────────────
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

  // ── TAPAS FRÍAS ────────────────────────────────────────────
  { name: 'Ensaladilla Rusa', description: 'Ensaladilla casera con picos de Triana', price: 3.50, category: 'tapa_fria', stock: 40 },
  { name: 'Aliño de Papas con Melva', description: 'Papas aliñadas con melva canutera y cebolleta', price: 3.80, category: 'tapa_fria', stock: 35 },
  { name: 'Queso Viejo de Oveja', description: 'Queso curado de oveja con aceite de oliva virgen extra', price: 4.00, category: 'tapa_fria', stock: 30 },
  { name: 'Jamón Ibérico de Bellota (tapa)', description: 'Jamón ibérico de bellota cortado a cuchillo', price: 8.50, category: 'tapa_fria', stock: 20 },
  { name: 'Lomo Ibérico en Manteca', description: 'Lomo de cerdo ibérico en manteca colorá', price: 3.80, category: 'tapa_fria', stock: 30 },
  { name: 'Salmorejo', description: 'Salmorejo cordobés con huevo y jamón', price: 4.50, category: 'tapa_fria', stock: 35 },
  { name: 'Gazpacho Andaluz', description: 'Gazpacho fresco de tomate, pepino y pimiento', price: 3.50, category: 'tapa_fria', stock: 40 },
  { name: 'Ajoblanco', description: 'Sopa fría de almendras con uvas', price: 3.50, category: 'tapa_fria', stock: 25 },

  // ── TAPAS CALIENTES ────────────────────────────────────────
  { name: 'Solomillo al Whisky', description: 'Solomillo de cerdo flambéado al whisky', price: 4.50, category: 'tapa_caliente', stock: 30 },
  { name: 'Carrillada Ibérica al Vino Tinto', description: 'Carrillada estofada lentamente al vino tinto', price: 4.80, category: 'tapa_caliente', stock: 25 },
  { name: 'Espinacas con Garbanzos', description: 'Espinacas salteadas con garbanzos y comino', price: 4.00, category: 'tapa_caliente', stock: 35 },
  { name: 'Pavía de Bacalao', description: 'Bacalao rebozado frito crujiente', price: 3.50, category: 'tapa_caliente', stock: 30 },
  { name: 'Croqueta de Jamón Ibérico', description: 'Croqueta casera cremosa de jamón ibérico', price: 3.00, category: 'tapa_caliente', stock: 50 },
  { name: 'Tortilla de Patatas', description: 'Tortilla española jugosa, al punto', price: 3.50, category: 'tapa_caliente', stock: 40 },
  { name: 'Choco Frito', description: 'Chocos fritos con limón', price: 4.00, category: 'tapa_caliente', stock: 25 },
  { name: 'Huevos a la Flamenca', description: 'Huevos fritos sobre pisto con jamón y patatas', price: 4.50, category: 'tapa_caliente', stock: 20 },
  { name: 'Punta de Solomillo al Pedro Ximénez', description: 'Punta de solomillo con reducción de PX', price: 5.50, category: 'tapa_caliente', stock: 20 },

  // ── MONTADITOS ─────────────────────────────────────────────
  { name: 'Montadito de Pringá', description: 'Pan de pueblo con pringá de cocido', price: 3.00, category: 'montadito', stock: 40 },
  { name: 'Serranito', description: 'Lomo, jamón serrano y pimiento frito en pan de mollas', price: 4.50, category: 'montadito', stock: 30 },
  { name: 'Piripi', description: 'Pan con pringá, jamón y huevo frito', price: 3.50, category: 'montadito', stock: 35 },
  { name: 'Montadito de Chicharrones', description: 'Chicharrones calientes en pan de Sevilla', price: 2.80, category: 'montadito', stock: 40 },
  { name: 'Cateto', description: 'Pan con jamón, queso y tomate rallado', price: 3.20, category: 'montadito', stock: 35 },
  { name: 'Montadito de Bacalao', description: 'Bacalao frito con alioli en pan', price: 3.50, category: 'montadito', stock: 30 },

  // ── RACIONES ───────────────────────────────────────────────
  { name: 'Ración de Adobo', description: 'Adobo de choco frito con limón', price: 9.00, category: 'racion', stock: 20 },
  { name: 'Ración de Croquetas Caseras', description: 'Croquetas de jamón ibérico (8 unidades)', price: 10.00, category: 'racion', stock: 20 },
  { name: 'Jamón Ibérico de Bellota (ración)', description: 'Jamón ibérico de bellota cortado a cuchillo, ración completa', price: 18.00, category: 'racion', stock: 15 },
  { name: 'Ración de Pescaíto Frito', description: 'Variado de pescaíto frito: chanquetes, boquerones, salmonetes', price: 12.00, category: 'racion', stock: 15 },
  { name: 'Ración de Gambas al Ajillo', description: 'Gambas en aceite de oliva con ajo laminado y guindilla', price: 11.00, category: 'racion', stock: 18 },
  { name: 'Ración de Solomillo al Whisky', description: 'Solomillo de cerdo flambéado al whisky con patatas', price: 14.00, category: 'racion', stock: 15 },
  { name: 'Arroz Meloso de Carrillada Ibérica', description: '★ ESPECIAL ★ Arroz meloso con carrillada ibérica', price: 16.00, category: 'racion', stock: 12 },
  { name: 'Presa Ibérica con Salsa de Vino Oloroso', description: '★ ESPECIAL ★ Presa ibérica a la brasa con salsa de vino oloroso', price: 18.00, category: 'racion', stock: 10 },

  // ── POSTRES ────────────────────────────────────────────────
  { name: 'Tocino de Cielo', description: 'Tocino de cielo de Jerez, dulce tradicional', price: 3.00, category: 'postre', stock: 25 },
  { name: 'Flan de Huevo Casero', description: 'Flan de huevo tradicional con caramelo', price: 3.00, category: 'postre', stock: 25 },
  { name: 'Arroz con Leche', description: 'Arroz con leche casero con canela', price: 3.50, category: 'postre', stock: 20 },
  { name: 'Torrijas', description: 'Torrija andaluza con miel y canela (temporada)', price: 3.50, category: 'postre', stock: 15 },
  { name: 'Queso con Membrillo', description: 'Queso manchego con dulce de membrillo', price: 4.00, category: 'postre', stock: 20 },
  { name: 'Helado de Nata y Canela', description: 'Helado artesanal de nata con canela', price: 3.50, category: 'postre', stock: 30 },
]
