# Task 2 - backend-auth-security-agent

## Task: Auth flow, onboarding, password reset, SaaS subscription guard

## Files Modified:
- `/src/lib/validations.ts` — Added 5 new Zod schemas
- `/src/lib/audit.ts` — Added 5 new audit action types + 'restaurant' entity type
- `/src/lib/auth.ts` — Added `requireActiveSubscription()` function
- `/src/app/api/auth/route.ts` — Added `mustChangePassword` to login/refresh/me responses
- `/src/app/api/users/route.ts` — Added `mustChangePassword` default, PUT for active toggle
- `/src/app/api/restaurants/route.ts` — Added PUT handler with subscriptionStatus support
- `/src/app/api/orders/route.ts` — Added subscription guard on POST
- `/src/app/api/orders/[id]/route.ts` — Added subscription guard on PUT
- `/src/app/api/orders/[id]/pay/route.ts` — Added subscription guard on POST

## Files Created:
- `/src/app/api/users/change-password/route.ts` — Self-service password change
- `/src/app/api/users/[id]/reset-password/route.ts` — Admin password reset
- `/src/app/api/onboarding/route.ts` — Restaurant onboarding (super_admin)
- `/src/app/api/restaurants/[id]/route.ts` — Single restaurant GET/PUT

## Key Decisions:
- `requireActiveSubscription` takes restaurantId + userRole, super_admin always bypasses
- Onboarding uses $transaction for atomicity (restaurant + admin user)
- mustChangePassword defaults to true on user creation unless explicitly set to false
- User deactivation has self-protection (can't deactivate yourself) and role escalation checks
- Subscription guard only on write operations (POST orders, PUT orders, POST pay) not reads
