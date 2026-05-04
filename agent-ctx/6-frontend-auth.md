# Task 6 - Frontend Auth & Logic Updates

## Agent: frontend-auth

## Summary
Updated the frontend page.tsx (1555 lines) with authentication, auth headers on all API calls, role-based socket room joining, payment method selector, and modifiers display. No visual design changes were made.

## Changes Made

### /src/app/page.tsx
1. **Imports**: Added `createContext`, `useContext` from React; `LogOut` from lucide-react; removed `useRef`, `disconnectSocket`
2. **AuthContext**: Created `AuthContext` with `createContext` and `useAuth()` hook for sharing auth state across components
3. **Types**: Added `modifiers: string` to `OrderItemDetail`; added `createdById?: string | null` and `finishedById?: string | null` to `Order`
4. **Login Screen**: When `!authToken`, shows centered login card with username/password inputs, amber theme, error display
5. **Auth State**: `authToken`, `currentUser`, `loginUsername`, `loginPassword`, `loginError`, `loginLoading` state variables
6. **localStorage**: Persists/restores token+user; clears on logout or 401
7. **authHeaders helper**: `authHeaders(contentType=true)` returns headers with optional Content-Type and Authorization Bearer token
8. **handleFetchResponse**: Checks for 401, auto-logs out with toast notification
9. **All fetch calls updated**: 10 fetch calls across CamareroTab (4), CocinaTab (3), CajaTab (3) now use authHeaders
10. **3 socket.emit calls removed**: `order-created` (CamareroTab), `order-ready` (CocinaTab), `table-cleared` (CajaTab)
11. **Role-based socket join**: cocina→kitchen, caja→caja, others→admin; removed direct join-room from CocinaTab and CajaTab
12. **Payment method selector**: Added `selectedPaymentMethod` state and Efectivo/Tarjeta buttons in CajaTab payment panel
13. **handleCobrar**: Now sends `paymentMethod` in request body
14. **Logout button**: Added in header with user info badge (name · role)
15. **Modifiers display**: In CocinaTab KDS, shows modifiers in red text when present

### /src/lib/socket.ts
- Removed `socket!.emit('join-room', 'admin')` from connect handler; room joining is now handled by the page component

## Verification
- ESLint passes with zero errors on modified files
- Dev server compiles successfully (200 OK)
- No visual design changes - all existing screens preserved
