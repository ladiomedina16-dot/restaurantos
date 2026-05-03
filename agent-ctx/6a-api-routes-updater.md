# Task 6-a: Update auth and users API routes with multi-restaurant support

## Agent: api-routes-updater

## Summary
Updated 2 API route files (`auth/route.ts` and `users/route.ts`) with multi-restaurant support, Zod validation, rate limiting, audit logging, and centralized error handling.

## Files Changed

### 1. `/src/app/api/auth/route.ts`

**New imports:**
- `checkRateLimit`, `clearRateLimit` from `@/lib/auth` — for login rate limiting
- `validateInput`, `loginSchema`, `refreshTokenSchema` from `@/lib/validations` — for Zod input validation
- `handleApiError` from `@/lib/errors` — for centralized error handling
- `createAuditLog` from `@/lib/audit` — for audit trail

**Changes:**
- Added `getClientIp()` helper extracting from `x-forwarded-for` / `x-real-ip` / `'unknown'`
- **Rate limiting on login:** checks `checkRateLimit(clientIp)` before processing; returns 429 with `retryAfterSeconds` and `Retry-After` header if blocked
- **Zod validation:** login input validated with `loginSchema`; refresh token input validated with `refreshTokenSchema`
- **restaurantId in JWT:** both login and refresh flows now include `user.restaurantId` in the `JwtPayload` and response body
- **Audit logging:**
  - `login_failed` with reason (`user_not_found`, `user_inactive`, `wrong_password`) on all failure paths
  - `login_success` on successful authentication
- **Clear rate limit** on successful login via `clearRateLimit(clientIp)`
- **Error handling:** all catch blocks now use `handleApiError()` instead of manual `console.error` + `NextResponse.json`
- GET `/api/auth/me` now returns `restaurantId` in the user response

### 2. `/src/app/api/users/route.ts`

**New imports:**
- `requireRestaurantScope` from `@/lib/auth` — for restaurant-scoped access control
- `validateInput`, `createUserSchema` from `@/lib/validations` — for Zod validation
- `handleApiError` from `@/lib/errors` — for centralized error handling
- `createAuditLog` from `@/lib/audit` — for audit trail

**Changes:**
- **GET — Restaurant-scoped filtering:**
  - `super_admin`: optionally filters by `X-Restaurant-Id` header; if absent, sees all users
  - Non-super_admin: only sees users from their own `restaurantId`; if they have none, returns empty list
  - Added `restaurantId` to select fields in response
- **POST — Zod validation:** input validated with `createUserSchema` (username min 3, password min 6, role enum, optional restaurantId)
- **POST — Restaurant assignment:**
  - `super_admin` can specify `restaurantId` in the request body
  - Non-super_admin: new user inherits creator's `restaurantId`
  - Sets `restaurantId` on the created user record
- **POST — Audit logging:** creates `user_created` audit log with details including username, role, active status, restaurantId
- **Error handling:** all catch blocks now use `handleApiError()` instead of manual error responses
- **GET/POST:** added `restaurantId` to select fields in responses

## Key Patterns

### Rate limiting pattern (auth):
```ts
const clientIp = getClientIp(request)
const rateLimitResult = checkRateLimit(clientIp)
if (!rateLimitResult.allowed) {
  return NextResponse.json({ error: '...', retryAfterSeconds }, { status: 429, headers: { 'Retry-After': ... } })
}
// ... on success:
clearRateLimit(clientIp)
```

### Zod validation pattern:
```ts
const validation = validateInput(loginSchema, { username, password })
if (!validation.success) return validation.error
const { username, password } = validation.data
```

### Restaurant scoping pattern (GET users):
```ts
if (user.role === 'super_admin') {
  const headerRestaurantId = request.headers.get('X-Restaurant-Id')
  if (headerRestaurantId) where.restaurantId = headerRestaurantId
} else {
  where.restaurantId = user.restaurantId
}
```

### Audit logging pattern:
```ts
await createAuditLog({
  restaurantId: user.restaurantId ?? 'unknown',
  userId: user.id,
  action: 'login_success',
  entityType: 'auth',
  ipAddress: clientIp,
})
```

## Verification
- ESLint: 0 errors across both files
- Dev server: compiles and runs successfully
- No existing functional logic was removed or changed — only additions for multi-restaurant, validation, rate limiting, audit, and error handling
