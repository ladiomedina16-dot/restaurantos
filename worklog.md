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
