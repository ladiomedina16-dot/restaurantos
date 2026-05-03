---
Task ID: 1-8
Agent: Main Orchestrator
Task: Complete RestaurantOS v2 security, auth, and architecture overhaul

Work Log:
- Explored entire existing codebase (Prisma schema, 12 API routes, 1556-line page.tsx, Socket.io server, seed script)
- Installed bcryptjs and jsonwebtoken packages
- Redesigned Prisma schema: replaced Admin with User model (6 roles), added Payment model, OrderItem.modifiers, Order.createdById/finishedById
- Created /src/lib/auth.ts with JWT, bcrypt, role-based permissions (ROLE_PERMISSIONS map), authenticateAndAuthorize helper
- Created /src/lib/realtime.ts with server-side emit helpers (emitOrderCreated, emitOrderReady, emitTableCleared, emitTableStatusChanged)
- Rewrote Socket.io server v2: clients can only LISTEN, server-only emissions via HTTP POST /emit with API secret
- Updated all 12 API routes + created /api/users with auth and role-based access control
- Updated frontend page.tsx: AuthContext with login screen, authHeaders, 401 auto-logout, removed 3 socket.emit calls, added payment method selector
- Updated socket.ts: removed auto join-room on connect
- Updated seed.ts: 7 users with bcrypt hashed passwords, idempotent upsert/try-catch pattern
- Pushed schema changes, seeded database, verified all APIs work with authentication

Stage Summary:
- User model replaces Admin: 6 roles (super_admin, admin, encargado, camarero, cocina, caja)
- All API routes require JWT authentication via Authorization: Bearer header
- Role-based permissions enforced (e.g., cocina can only read/update orders, caja can only pay)
- Real-time events now server-only: API routes emit via HTTP POST to Socket.io server
- Frontend never emits broadcast events, only listens
- Payment model tracks method (efectivo/tarjeta), user, discount, points
- OrderItem.modifiers field supports JSON string for customizations
- Login credentials: admin/Adm1n!2024, camarero1/C4m4r3r0!2024, cocina1/C0c1n4!2024, caja1/C4j4!2024
- All tests pass: login returns JWT, protected routes return 401 without token, role-based access works

---
Task ID: 9-15
Agent: Main Orchestrator
Task: Supabase PostgreSQL migration, Socket.io fix, Auth improvements, Production hardening

Work Log:
- Migrated Prisma from SQLite to Supabase PostgreSQL (provider=postgresql, directUrl for migrations)
- Changed all Float fields (Double deprecated in Prisma v6)
- Updated .env with Supabase DATABASE_URL, DIRECT_URL, JWT_SECRET, API_SECRET, SOCKET_SERVER_URL
- Pushed schema to Supabase, seeded with 7 users, 18 products, 25 tables, 3 clients
- Fixed Socket.io server v3: changed path from '/' to '/socket.io' to prevent intercepting HTTP POST /emit
- Updated client socket.ts: path '/socket.io' with XTransformPort query param
- Added JWT refresh token support: signRefreshToken, verifyRefreshToken, 7-day expiry
- Updated auth route: dual login/refresh flow, removed hardcoded super_admin creation
- Fixed auth route bug: renamed destructured refreshToken param to avoid conflict with const
- Updated frontend: stores refreshToken in localStorage, auto-refreshes expired tokens on mount
- Fixed PostgreSQL compatibility: clients search uses `mode: 'insensitive'` for case-insensitive contains
- Reduced Prisma logging: only warn/error in dev, error in production
- Updated realtime.ts: uses env vars for SOCKET_SERVER_URL and API_SECRET
- Fixed dev script: uses node instead of bun for Next.js (bun crashes with Prisma+PostgreSQL)
- Created start.sh with proper env var exports for both services
- Verified full E2E flow: login → products → tables → create order → kitchen view → mark ready → pay

Stage Summary:
- Database: Supabase PostgreSQL fully connected and seeded
- Socket.io: Server-only emissions working (POST /emit with secret auth)
- Auth: JWT (8h) + Refresh Token (7d), auto-refresh on expiry
- All 6 user roles verified: admin, camarero, cocina, caja working correctly
- E2E test passed: Order created (€6.5), marked ready by cocina, paid by caja with efectivo
- Services stable: Next.js on :3000, Socket.io on :3003
- Login credentials: admin/Adm1n!2024, camarero1/C4m4r3r0!2024, cocina1/C0c1n4!2024, caja1/C4j4!2024
