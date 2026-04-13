import { create } from 'zustand';

const SESSION_KEY = 'himbyte_current_order';

function readPersistedOrder() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistOrder(order) {
  try {
    if (order) sessionStorage.setItem(SESSION_KEY, JSON.stringify(order));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* quota / SSR */ }
}

export const useOrderStore = create((set) => ({
  pendingOrders: [],
  activeOrders: [],   // approved | preparing | ready
  currentOrder: readPersistedOrder(),

  setPendingOrders: (orders) => set({ pendingOrders: orders }),
  setActiveOrders:  (orders) => set({ activeOrders: orders }),
  setCurrentOrder:  (order)  => {
    persistOrder(order);
    set({ currentOrder: order });
  },

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

  /** Merge a full order row from Supabase Realtime into staff lists (Realtime payloads may omit joins) */
  upsertFromRealtime: (order) =>
    set((state) => {
      const pool = [...state.pendingOrders, ...state.activeOrders];
      const prev = pool.find((o) => o.id === order.id);
      const merged = prev ? { ...prev, ...order } : order;

      let pending = state.pendingOrders.filter((o) => o.id !== order.id);
      let active = state.activeOrders.filter((o) => o.id !== order.id);
      if (merged.status === 'pending') {
        pending = [merged, ...pending];
      } else if (['approved', 'preparing', 'ready'].includes(merged.status)) {
        active = [merged, ...active];
      }
      return { pendingOrders: pending, activeOrders: active };
    }),
}));
