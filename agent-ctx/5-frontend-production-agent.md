# Task 5 - Frontend Production Features

## Summary
Implemented all 7 frontend production features for RestaurantOS in `/home/z/my-project/src/app/page.tsx` (1598 → 2362 lines) and `/home/z/my-project/src/lib/store.ts`.

## Changes Made

### 1. mustChangePassword Dialog
- Added `mustChangePassword?: boolean` to `AuthContextType.currentUser` type
- Updated login and refresh token handlers to extract `mustChangePassword` from API responses
- Dialog is unclosable (no X, blocks outside clicks and Escape key)
- Has current password, new password, confirm password fields
- Calls `POST /api/users/change-password`
- On success, updates user state and localStorage, closes dialog

### 2. SaaS Subscription Suspended Banner
- Red banner at top of page with AlertTriangle icon
- Shows "Restaurante suspendido. Contacte al administrador del sistema."
- Only visible for non-super_admin users
- Fetches restaurant info from `GET /api/restaurants/[id]` on login

### 3. Print Buttons
- `handlePrintTicket` helper function: calls `POST /api/print`, opens new window, writes HTML, calls print()
- **CocinaTab**: Kitchen print (Printer icon) and Bar print (Wine icon) buttons next to TERMINAR
- **CajaTab**: Print receipt button (Printer icon) after COBRAR button

### 4. Cash Session in CajaTab
- State: cashSession, open/close dialogs, input fields, close summary
- Fetches `GET /api/cash-sessions?current=true` on mount
- "Abrir Caja" button when no session, "Cerrar Caja" when session open
- Session info card shows opening cash, time, opened by
- COBRAR button disabled when no open session with "Abre caja para poder cobrar" message
- Close summary shows totalSales, expected vs actual, difference

### 5. Reports Tab (ReportesTab)
- Visible to super_admin, admin, encargado roles only
- 5 report types with selector buttons: daily_sales, payment_methods, top_products, cancelled_orders, cash_closes
- Date range pickers (dateFrom, dateTo)
- Fetches `GET /api/reports?type=...&dateFrom=...&dateTo=...`
- Appropriate display for each report type (tables, cards, ranked lists)

### 6. Onboarding for super_admin
- "Onboarding" button in header (Plus icon)
- Dialog with restaurant fields (name, slug, address, phone) and admin fields (name, username, password)
- Calls `POST /api/onboarding`
- Success toast: "Restaurante y admin creados correctamente"

### 7. Tab Bar Update
- Added 'reportes' to TabId type in store.ts
- Added reportes tab trigger with BarChart3 icon in admin TabsList
- Added TabsContent for reportes rendering ReportesTab component

## Lint Status
- `bun run lint` passes with no errors
- Dev server running and responding with 200
