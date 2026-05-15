// ─── RestaurantOS — UI Config (JSX-dependent) ─────────────────────────────
// Contains categoryConfig and zoneConfig with React.ReactNode icons.
// Extracted from src/app/page.tsx during Phase 2 refactor.

import {
  Beer,
  Salad,
  CookingPot,
  Sandwich,
  Soup,
  CakeSlice,
  MoreHorizontal,
  UtensilsCrossed,
  Wine,
  Utensils,
  Sun,
  Coffee,
} from 'lucide-react'

export const categoryConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  bebida: { label: 'Bebidas', icon: <Beer className="size-4" /> },
  tapa_fria: { label: 'Tapas Frías', icon: <Salad className="size-4" /> },
  tapa_caliente: { label: 'Tapas Calientes', icon: <CookingPot className="size-4" /> },
  montadito: { label: 'Montaditos', icon: <Sandwich className="size-4" /> },
  racion: { label: 'Raciones', icon: <Soup className="size-4" /> },
  postre: { label: 'Postres', icon: <CakeSlice className="size-4" /> },
  general: { label: 'Otros', icon: <MoreHorizontal className="size-4" /> },
  comida: { label: 'Comida', icon: <UtensilsCrossed className="size-4" /> },
}

export const zoneConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  bar: { label: 'Barra', icon: <Wine className="size-4" /> },
  main: { label: 'Salón', icon: <Utensils className="size-4" /> },
  terrace: { label: 'Terraza', icon: <Sun className="size-4" /> },
  private: { label: 'Privado', icon: <Coffee className="size-4" /> },
}
