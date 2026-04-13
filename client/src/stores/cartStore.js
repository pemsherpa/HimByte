import { create } from 'zustand';

function getOrCreateSessionId() {
  let id = sessionStorage.getItem('himbyte_session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('himbyte_session', id);
  }
  return id;
}

export const useCartStore = create((set, get) => ({
  items: [],
  restaurantId: null,
  tableRoomId: null,   // matches schema: table_room_id
  sessionId: getOrCreateSessionId(),

  setContext: (restaurantId, tableRoomId) => {
    set({ restaurantId, tableRoomId, sessionId: getOrCreateSessionId() });
  },

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.menu_item_id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            menu_item_id: item.id,
            name: item.name,
            price_at_time: item.price,   // matches schema: price_at_time
            quantity: 1,
            image_url: item.image_url,
          },
        ],
      };
    }),

  removeItem: (menuItemId) =>
    set((state) => ({ items: state.items.filter((i) => i.menu_item_id !== menuItemId) })),

  updateQuantity: (menuItemId, quantity) =>
    set((state) => {
      if (quantity <= 0) return { items: state.items.filter((i) => i.menu_item_id !== menuItemId) };
      return { items: state.items.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity } : i)) };
    }),

  getTotal: () =>
    get().items.reduce((sum, i) => sum + i.price_at_time * i.quantity, 0),
  getItemCount: () =>
    get().items.reduce((sum, i) => sum + i.quantity, 0),
  clearCart: () => set({ items: [] }),
}));
