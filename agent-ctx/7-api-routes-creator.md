# Task 7: Create API Routes for Restaurants, Cash Sessions, Print, and Audit Logs

## Agent: API Routes Creator

## Summary
Created 5 new API route files and updated 1 existing route (dashboard) with full multi-restaurant isolation, Zod validation, audit logging, and centralized error handling.

## Files Created

### 1. `/src/app/api/restaurants/route.ts`
- **GET**: List restaurants. super_admin sees all (or filtered by X-Restaurant-Id), others see only their own via `getRestaurantScope`
- **POST**: Create restaurant (super_admin only). Uses `createRestaurantSchema` + `validateInput`. Checks slug uniqueness
- Uses `handleApiError` for all error handling

### 2. `/src/app/api/cash-sessions/route.ts`
- **GET**: List cash sessions for user's restaurant. Supports `?status=open/closed` and `?current=true`
- **POST**: Open new cash session. Requires `cash:open` permission. Uses `openCashSessionSchema`. Checks no already-open session. Sets `openedById`. Audit log: `cash_session_opened`
- Uses `requireRestaurantScope` for restaurant isolation

### 3. `/src/app/api/cash-sessions/[id]/route.ts`
- **GET**: Single cash session with payments, openedBy, closedBy
- **PUT**: Close cash session. Requires `cash:close` permission. Uses `closeCashSessionSchema`. Calculates `expectedCash = openingCash + totalCash`, `difference = closingCash - expectedCash`. Computes `totalSales/totalCard/totalCash` from linked payments. Sets `closedById`, `closedAt`, `status=closed`. Audit log: `cash_session_closed`

### 4. `/src/app/api/print/route.ts`
- **POST**: Generate printable ticket HTML. Requires `print:read` permission. Uses `printTicketSchema`
  - `type=kitchen`: Food items only (excludes bebida category)
  - `type=bar`: Drinks only (bebida category)
  - `type=receipt`: Payment receipt with totals, method, discount, loyalty points
- Generates 80mm thermal-printer-compatible HTML with monospace font
- Audit log: `print_ticket`

### 5. `/src/app/api/audit-logs/route.ts`
- **GET**: List audit logs for user's restaurant. Requires `audit:read` permission
- Filters: `?action=`, `?entityType=`, `?userId=`, `?from=`, `?to=`
- Pagination: `?take=50&skip=0` (take capped at 200)
- Returns logs with user info + pagination metadata

## Files Updated

### 6. `/src/app/api/dashboard/route.ts`
- Added `requireRestaurantScope` import and call
- Added `restaurantId` filter to ALL queries (orders, tables, products, order items)
- Replaced manual error handling with `handleApiError`
- Replaced `NextResponse.json` with `Response.json` for consistency

## Key Patterns Used
- `authenticateAndAuthorize(request, permission)` for auth + permission check
- `requireRestaurantScope(user, request)` for restaurant isolation
- `validateInput(schema, body)` for Zod input validation
- `handleApiError(context, error)` for centralized error handling
- `createAuditLog({...})` for audit trail (non-blocking)

## Verification
- ESLint: 0 errors
- Dev server running normally
- All routes enforce restaurant isolation
