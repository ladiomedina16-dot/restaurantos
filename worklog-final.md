---
Task ID: final-audit
Agent: main-orchestrator
Task: Pre-production audit and fixes

Work Log:
- Audited full codebase: schema, APIs, frontend, lib files
- Added mustChangePassword field to User model (Prisma schema)
- Added subscriptionStatus field to Restaurant model (trial/active/suspended)
- Pushed schema changes to Supabase PostgreSQL
- Created /api/onboarding (super_admin creates restaurant + admin in one call)
- Created /api/users/change-password (user changes own password)
- Created /api/users/[id]/reset-password (admin resets user password, sets mustChangePassword: true)
- Created /api/reports with 5 report types: daily_sales, payment_methods, top_products, cancelled_orders, cash_closes
- Created /api/restaurants/[id] with GET/PUT for single restaurant management
- Added requireActiveSubscription() guard to order creation, modification, and payment endpoints
- Added cash session guard to /api/orders/[id]/pay (must have open cash session to process payments)
- Updated auth.ts with subscription guard function
- Updated validations.ts with changePasswordSchema, resetPasswordSchema, onboardingSchema, reportsQuerySchema
- Updated audit.ts with new action types: password_changed, password_reset, onboarding_completed, user_deactivated, subscription_changed
- Frontend: Added mustChangePassword dialog (unclosable, forces password change)
- Frontend: Added SaaS subscription suspended banner
- Frontend: Added print buttons in cocina (kitchen/bar tickets) and caja (receipt), using window.print()
- Frontend: Added cash session management in CajaTab (Abrir Caja / Cerrar Caja dialogs)
- Frontend: Disabled COBRAR when no open cash session
- Frontend: Added ReportesTab with 5 report types and date range filters
- Frontend: Added Onboarding button for super_admin
- Frontend: Added reportes tab to tab bar
- Updated seed.ts with subscriptionStatus: 'active' for both restaurants
- Ran seed successfully
- Lint passes clean
- Dev server running on port 3000
- Socket.io running on port 3003

Stage Summary:
- All 6 audit requirements implemented:
  1. Onboarding: super_admin creates restaurant + admin via /api/onboarding
  2. Role flow: Cash session required for payment, cocina/bar print filtering works
  3. Print system: 80mm tickets via /api/print, kitchen/bar/receipt types, window.print()
  4. Reports: 5 types via /api/reports (daily_sales, payment_methods, top_products, cancelled_orders, cash_closes)
  5. Security: mustChangePassword on first login, inactive user blocking, admin password reset
  6. SaaS: subscriptionStatus (trial/active/suspended), suspended blocks non-super_admin access
