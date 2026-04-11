import { create } from 'zustand';

export const useOrderStore = create((set) => ({
  pendingOrders: [],
  activeOrders: [],   // approved | preparing | ready
  currentOrder: null, // customer's own live order

  setPendingOrders: (orders) => set({ pendingOrders: orders }),
  setActiveOrders:  (orders) => set({ activeOrders: orders }),
  setCurrentOrder:  (order)  => set({ currentOrder: order }),

  addToPending: (order) =>
    set((state) => ({ pendingOrders: [order, ...state.pendingOrders] })),

  moveToActive: (orderId) =>
    set((state) => {
      const order = state.pendingOrders.find((o) => o.id === orderId);
      if (!order) return state;
      return {
        pendingOrders: state.pendingOrders.filter((o) => o.id !== orderId),
        activeOrders:  [{ ...order, status: 'approved' }, ...state.activeOrders],
      };
    }),

  removeFromPending: (orderId) =>
    set((state) => ({
      pendingOrders: state.pendingOrders.filter((o) => o.id !== orderId),
    })),

  updateStatus: (orderId, status) =>
    set((state) => {
      const update = (list) =>
        list.map((o) => (o.id === orderId ? { ...o, status, updated_at: new Date().toISOString() } : o));
      return {
        pendingOrders: update(state.pendingOrders),
        activeOrders:  update(state.activeOrders).filter((o) => o.status !== 'served'),
      };
    }),
}));
