import { create } from 'zustand'

export type TabId = 'dashboard' | 'products' | 'tables' | 'orders' | 'clients'

export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
}

export interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes: string
}

interface RestaurantStore {
  // Active tab
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  // Real-time notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  clearNotifications: () => void

  // Connection status
  realtimeConnected: boolean
  setRealtimeConnected: (connected: boolean) => void

  // Current order being edited
  currentOrderItems: OrderItem[]
  addOrderItem: (item: OrderItem) => void
  removeOrderItem: (productId: string) => void
  updateOrderItemQuantity: (productId: string, quantity: number) => void
  clearOrderItems: () => void
}

export const useRestaurantStore = create<RestaurantStore>((set) => ({
  // Active tab
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Real-time notifications
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
        ...state.notifications,
      ].slice(0, 50), // Keep max 50 notifications
    })),
  clearNotifications: () => set({ notifications: [] }),

  // Connection status
  realtimeConnected: false,
  setRealtimeConnected: (connected) => set({ realtimeConnected: connected }),

  // Current order being edited
  currentOrderItems: [],
  addOrderItem: (item) =>
    set((state) => {
      const existing = state.currentOrderItems.find(
        (i) => i.productId === item.productId
      )
      if (existing) {
        return {
          currentOrderItems: state.currentOrderItems.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        }
      }
      return {
        currentOrderItems: [...state.currentOrderItems, item],
      }
    }),
  removeOrderItem: (productId) =>
    set((state) => ({
      currentOrderItems: state.currentOrderItems.filter(
        (i) => i.productId !== productId
      ),
    })),
  updateOrderItemQuantity: (productId, quantity) =>
    set((state) => ({
      currentOrderItems:
        quantity <= 0
          ? state.currentOrderItems.filter((i) => i.productId !== productId)
          : state.currentOrderItems.map((i) =>
              i.productId === productId ? { ...i, quantity } : i
            ),
    })),
  clearOrderItems: () => set({ currentOrderItems: [] }),
}))
