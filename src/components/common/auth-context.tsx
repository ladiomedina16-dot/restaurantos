'use client'

import { createContext, useContext } from 'react'
import type { AuthContextType } from '@/types/restaurant'

// ─── Auth Context ────────────────────────────────────────────────────────────
// Extracted from src/app/page.tsx during Phase 2 refactor.
// The AuthContext is created here so that both page.tsx and extracted
// tab components share the same context instance.

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
