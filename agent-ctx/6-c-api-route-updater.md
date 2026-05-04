# Task 6-c: Update products, tables, and clients API routes with multi-restaurant support

## Agent: API Route Updater

## Summary
Successfully updated all 6 API route files to support multi-restaurant isolation, Zod validation, audit logging, and consistent error handling.

## Changes Made

### 1. `/api/products/route.ts`
- Replaced `authenticateRequest` with `authenticateAndAuthorize(request, 'products:read')` for GET
- Added `requireRestaurantScope` for restaurant isolation, filtering all queries by `restaurantId`
- Added `createProductSchema` + `validateInput()` for POST body validation
- Added `name_restaurantId` compound unique check on creation
- Sets `restaurantId` on product creation
- Added `createAuditLog` for `product_created`
- Replaced manual try/catch with `handleApiError`

### 2. `/api/products/[id]/route.ts`
- Added `requireRestaurantScope` to all handlers
- Added restaurant ownership check: returns 404 if `product.restaurantId !== restaurantId`
- Added `updateProductSchema` + `validateInput()` for PUT
- Added `name_restaurantId` compound unique check on name update
- Added `createAuditLog` for `product_updated` and `product_deleted`
- Replaced manual try/catch with `handleApiError`

### 3. `/api/tables/route.ts`
- Added `requireRestaurantScope` filtering by `restaurantId`
- Added `createTableSchema` + `validateInput()` for POST
- Changed uniqueness check from `findUnique({ where: { number } })` to `findUnique({ where: { number_restaurantId: { number, restaurantId } } })`
- Sets `restaurantId` on table creation
- Added `createAuditLog` for `table_created`
- Replaced manual try/catch with `handleApiError`

### 4. `/api/tables/[id]/route.ts`
- Added `requireRestaurantScope` and restaurant ownership check
- Added `updateTableSchema` + `validateInput()` for PUT
- Changed number uniqueness check to use `number_restaurantId` compound key
- Preserved existing `emitTableStatusChanged` real-time event
- Added `createAuditLog` for `table_updated` and `table_deleted`
- Replaced manual try/catch with `handleApiError`

### 5. `/api/clients/route.ts`
- Added `requireRestaurantScope` filtering by `restaurantId`
- Updated search `OR` clause to include `restaurantId` in each condition for proper scoped search
- Added `createClientSchema` + `validateInput()` for POST
- Changed uniqueness check from `findUnique({ where: { phone } })` to `findUnique({ where: { phone_restaurantId: { phone, restaurantId } } })`
- Sets `restaurantId` on client creation
- Added `createAuditLog` for `client_created`
- Replaced manual try/catch with `handleApiError`

### 6. `/api/clients/[id]/route.ts`
- Added `requireRestaurantScope` and restaurant ownership check
- Added `updateClientSchema` + `validateInput()` for PUT
- Changed phone uniqueness check to use `phone_restaurantId` compound key
- Preserved existing active orders check before deletion
- Added `createAuditLog` for `client_updated` and `client_deleted`
- Replaced manual try/catch with `handleApiError`

## Key Patterns Applied Consistently
1. **Auth flow**: `authenticateAndAuthorize` → `requireRestaurantScope` → business logic
2. **Data isolation**: All list queries filter by `restaurantId`; all single-entity lookups verify `entity.restaurantId === restaurantId`
3. **Compound unique constraints**: `name_restaurantId`, `number_restaurantId`, `phone_restaurantId`
4. **Zod validation**: `validateInput(schema, body)` before any business logic
5. **Audit logging**: `createAuditLog()` after every CUD operation with relevant details
6. **Error handling**: `handleApiError(context, error)` in every catch block

## Verification
- ESLint: passes with no errors
- Dev server: running normally on :3000
