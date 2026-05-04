# Task 6-b: Update Orders API Routes with Multi-Restaurant Support

## Agent: Orders API Multi-Restaurant Update

## Summary
Updated all 3 order API route files to support multi-restaurant isolation, Zod validation, audit logging, and centralized error handling.

## Files Modified

### 1. `/src/app/api/orders/route.ts`
- **GET**: Added `requireRestaurantScope` → filters all queries by `restaurantId`
- **POST**: Added `requireRestaurantScope` + `createOrderSchema` Zod validation + `restaurantId` on order creation + restaurant-scoped table/client/product lookups + `createAuditLog('order_created')` + `handleApiError`

### 2. `/src/app/api/orders/[id]/route.ts`
- **GET**: Added `requireRestaurantScope` → data isolation check (404 if wrong restaurant)
- **PUT**: Added `requireRestaurantScope` + `updateOrderSchema` Zod validation + data isolation on existing order (404 not 403) + `restaurantId` on activeOrdersCount queries + `createAuditLog('order_cancelled' | 'order_status_changed')` + `handleApiError`

### 3. `/src/app/api/orders/[id]/pay/route.ts`
- **POST**: Added `requireRestaurantScope` + `payOrderSchema` Zod validation + data isolation check (404) + `restaurantId` on activeOrdersCount query + `createAuditLog('payment_processed')` + `handleApiError`

## Key Design Decisions
- Used `requireRestaurantScope(user, request)` matching actual code signature (user first, request second)
- Data isolation returns 404 (not 403) to avoid information leakage about other restaurants' orders
- All existing business logic preserved: price calculations, stock management, table status, 5ª gratis, loyalty points
- Audit logging is fire-and-forget (non-blocking per `createAuditLog` design)
- Table/client/product existence checks now also verify `restaurantId` ownership

## Verification
- ESLint: 0 errors
- Dev server: running cleanly
