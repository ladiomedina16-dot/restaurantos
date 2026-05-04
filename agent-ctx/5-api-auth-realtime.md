# Task 5: API Authentication, Real-time Emissions & New Features

## Agent: api-updater

## Summary
Updated all 12 API route files with JWT authentication, server-side real-time event emissions, and new features. Created 1 new file (users API).

## Files Changed

### 1. `/src/app/api/auth/route.ts` — Complete rewrite
- Replaced plain-text Admin auth with JWT-based User auth
- POST /api/auth/login: Accepts { username, password }, verifies with bcrypt via `verifyPassword`, returns JWT token + user info via `signToken`
- GET /api/auth/me: Returns current user from JWT token (Authorization: Bearer xxx) via `verifyToken`
- Auto-creates super_admin user on first login attempt if none exists (with bcrypt-hashed password)
- Uses `db.user` (User model) instead of `db.admin`
- Checks `user.active` status on both login and /me endpoints

### 2. `/src/app/api/users/route.ts` — NEW FILE
- GET: List users with role/active filters (requires `users:read` permission)
- POST: Create user with bcrypt hashed password (requires `users:create` permission)
- Validates password min length (6 chars)
- Validates role against allowed roles (super_admin, admin, encargado, camarero, cocina, caja)
- Only super_admin can create super_admin or admin users
- Checks username uniqueness
- Never returns passwordHash in responses

### 3. `/src/app/api/orders/route.ts` — Updated
- Added auth to GET (`orders:read`) and POST (`orders:create`)
- POST saves `createdById` from authenticated user
- POST handles `modifiers` on items: `item.modifiers` array → JSON string for DB storage
- After successful POST, calls `emitOrderCreated(order)` from `@/lib/realtime`
- GET includes `createdBy` and `finishedBy` relations in response
- Prices still calculated from DB products only (verified)

### 4. `/src/app/api/orders/[id]/route.ts` — Updated
- Added auth to GET (`orders:read`) and PUT (`orders:update`)
- When status changes to 'ready', saves `finishedById` from authenticated user
- After any status change, calls `emitOrderStatusChanged(order)`
- After status → 'ready', also calls `emitOrderReady(order)`
- All responses include `createdBy` and `finishedBy` user info

### 5. `/src/app/api/orders/[id]/pay/route.ts` — Major update
- Added auth (`orders:pay` permission, typically caja/admin)
- Accepts `{ applyDiscount: boolean, paymentMethod: 'efectivo' | 'tarjeta' }`
- Creates a Payment record in DB with: orderId, userId (from auth), amount, method, discount, freeDrinks, pointsEarned
- After payment, calls `emitOrderStatusChanged(order)` and `emitTableCleared(tableId, tableNumber)` (if table freed)
- Keeps existing loyalty logic (5ª gratis, 1€=1 punto)
- Response includes `paymentMethod` and `processedBy` username

### 6. `/src/app/api/products/route.ts` — Updated
- Added auth to POST (`products:create`)
- GET is public for any authenticated user (uses `authenticateRequest`)

### 7. `/src/app/api/products/[id]/route.ts` — Updated
- Added auth to PUT (`products:update`) and DELETE (`products:delete`)
- GET is public for any authenticated user

### 8. `/src/app/api/tables/route.ts` — Updated
- Added auth to POST (`tables:create`)
- GET is public for any authenticated user

### 9. `/src/app/api/tables/[id]/route.ts` — Updated
- Added auth to PUT (`tables:update`) and DELETE (`tables:delete`)
- After table status change, calls `emitTableStatusChanged(table)`
- GET is public for any authenticated user

### 10. `/src/app/api/clients/route.ts` — Updated
- Added auth to POST (`clients:create`)
- GET is public for any authenticated user

### 11. `/src/app/api/clients/[id]/route.ts` — Updated
- Added auth to PUT (`clients:update`) and DELETE (`clients:delete`)
- GET is public for any authenticated user

### 12. `/src/app/api/dashboard/route.ts` — Updated
- Added auth with `dashboard:read` permission
- Now requires `request: Request` parameter (was parameterless before)

## Key Patterns Used

### Auth pattern:
```ts
const auth = authenticateAndAuthorize(request, 'orders:read')
if ('error' in auth) return auth.error
const { user } = auth
```

### Public read pattern (any authenticated user):
```ts
const auth = authenticateRequest(request)
if (!auth.success) return auth.response
```

### Real-time emission pattern:
```ts
await emitOrderCreated(order)
await emitOrderStatusChanged(order)
await emitOrderReady(order)
await emitTableCleared(tableId, tableNumber)
await emitTableStatusChanged(table)
```

## Verification
- ESLint passes on all API route files (0 errors in src/app/api/)
- Database is in sync with Prisma schema (User, Payment models exist)
- No references to `db.admin` remain in the codebase
- Dev server compiles successfully
