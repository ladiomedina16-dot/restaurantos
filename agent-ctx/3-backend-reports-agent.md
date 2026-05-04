# Task 3 - backend-reports-agent

## Task: Reports API and cash session guard

## Work Completed

### 1. Reports API (`/src/app/api/reports/route.ts`)
- Created GET endpoint requiring `dashboard:read` permission
- All queries scoped to `restaurantId` via `requireRestaurantScope`
- 5 report types implemented:
  - `daily_sales`: Groups orders by day, returns totalRevenue, totalOrders, avgTicket, days[]
  - `payment_methods`: Groups payments by efectivo/tarjeta with count and total
  - `top_products`: Uses orderItem.groupBy by productId, enriched with product names
  - `cancelled_orders`: Lists cancelled orders with items, totals, lost revenue
  - `cash_closes`: Lists closed cash sessions with amounts, differences, user info
- Default date range: today (from start of day to start of next day)
- Zod validated via `reportsQuerySchema`

### 2. Cash Session Guard (`/src/app/api/orders/[id]/pay/route.ts`)
- Added check for open CashSession before processing any payment
- Returns 400 with message "No hay sesión de caja abierta. Abre caja antes de cobrar." if no open session
- Payments now linked to open cash session via `cashSessionId` field

### 3. Validation Schema (`/src/lib/validations.ts`)
- Added `reportsQuerySchema` with type enum and optional dateFrom/dateTo

## Files Changed
- `/src/lib/validations.ts` - Added reportsQuerySchema
- `/src/app/api/reports/route.ts` - New file
- `/src/app/api/orders/[id]/pay/route.ts` - Added cash session guard + cashSessionId link
