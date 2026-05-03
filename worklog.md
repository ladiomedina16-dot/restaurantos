# RestaurantOS — Worklog

---
Task ID: 1
Agent: Main
Task: Adjust RestaurantOS with real initial data, super_admin, zone-based permissions, and Sevillian menu

Work Log:
- Added `zone` field (String?, optional) to User model in `prisma/schema.prisma` for zone-based camarero assignments
- Completely rewrote `prisma/seed.ts` with:
  - Clean slate deletion of all existing data before seeding
  - Single restaurant: "La Carta de Sevilla" at Calle Betis 42, Triana, Sevilla
  - 8 users with clear credentials and zone assignments
  - 52 products: 15 bebidas, 8 tapas frías, 9 tapas calientes, 6 montaditos, 8 raciones (incl. 2 specials), 6 postres
  - 34 tables: 6 barra (1-6), 14 salón (11-24), 14 terraza (31-44)
  - 5 CRM clients with loyalty points
- Updated `src/lib/auth.ts`:
  - Added `zone` to JwtPayload interface
  - Added `getZoneFilter()` helper for zone-based API filtering
  - Added 'reportes' tab to `canAccessTab()`
- Updated `src/lib/validations.ts`: Added `zone` field to createUserSchema
- Updated `src/app/api/auth/route.ts`: Zone included in JWT payload, login response, refresh response, and /me endpoint
- Updated `src/app/api/tables/route.ts`: Zone filtering for camareros via `getZoneFilter()`
- Updated `src/app/api/orders/route.ts`: Zone filtering for camareros (filter by table.zone)
- Updated `src/app/api/users/route.ts`: Zone field in user creation, listing, and updates
- Updated `src/app/page.tsx`: Zone included in frontend userData objects
- Fixed `src/lib/db.ts`: Detect stale SQLite DATABASE_URL and override with PostgreSQL URL from .env
- Pushed schema to Supabase PostgreSQL and ran seed successfully
- Lint passes with no errors

Stage Summary:
- All code changes complete and linting clean
- Database seeded with real Sevillian menu and zone-based users
- Zone-based permission filtering active in tables and orders APIs
- Server tested: superadmin, admin, camarero_terraza logins all work via Caddy proxy
- JWT tokens now include zone field for camareros
