---
Task ID: 4
Agent: full-stack-developer
Task: Create main frontend layout

Work Log:
- Initialized fullstack development environment
- Created /src/lib/store.ts with Zustand store containing: activeTab state, notifications management, realtime connection status, and current order items management
- Updated /src/app/layout.tsx with RestaurantOS metadata, Sonner toaster, and min-h-screen flex flex-col body wrapper
- Created /src/app/page.tsx as a 'use client' component with:
  - Sticky header with Flame logo, "RestaurantOS" title, Wifi/WifiOff connection badge, notification popover with bell icon and unread count, and settings button
  - Tab navigation using shadcn/ui Tabs component with amber-600 accent underline style for 5 tabs: Dashboard, Products, Tables, Orders, Clients
  - Each tab renders a dedicated content component with proper structure
  - Tab icons show on mobile, icon+label on sm+ screens
  - Sticky footer with copyright and version, using mt-auto technique
  - Warm amber/orange color scheme (amber-600, orange-600) throughout
- Verified lint passes with no errors
- Verified dev server compiles successfully with 200 responses

Stage Summary:
- Key files created: /src/lib/store.ts, /src/app/page.tsx
- Key files updated: /src/app/layout.tsx
- All components use existing shadcn/ui components (Tabs, Button, Badge, Popover, ScrollArea, Separator)
- Color scheme: amber-600/orange-600 as primary accents (no indigo/blue)
- Responsive: hidden labels on mobile, visible on sm+ breakpoint
- Footer uses mt-auto for sticky behavior
