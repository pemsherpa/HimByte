import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import CustomerLayout from '../../components/layout/CustomerLayout';
import MenuItemCard from '../../components/ui/MenuItemCard';
import CartDrawer from '../../components/ui/CartDrawer';
import StatusBar from '../../components/ui/StatusBar';

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const slug        = searchParams.get('r');
  const locationId  = searchParams.get('loc');
  const legacyTable = searchParams.get('table');
  const legacyRoom  = searchParams.get('room');

  const [restaurant, setRestaurant]   = useState(null);
  const [categories, setCategories]   = useState([]);
  const [items, setItems]             = useState([]);
  const [activeCategory, setActive]   = useState(null);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [cartOpen, setCartOpen]       = useState(false);

  const setContext   = useCartStore((s) => s.setContext);
  const currentOrder = useOrderStore((s) => s.currentOrder);
  const setOrder     = useOrderStore((s) => s.setCurrentOrder);

  const isRoom = !!legacyRoom;  // simple heuristic for service categories

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    api.getRestaurant(slug).then(async (r) => {
      setRestaurant(r);

      // Resolve table_room_id
      let tableRoomId = locationId || null;
      if (!tableRoomId && (legacyTable || legacyRoom)) {
        try {
          const all = await api.getTablesRooms(r.id, legacyRoom ? 'room' : 'table');
          const keyword = legacyTable || legacyRoom;
          const found = all.find((t) => t.identifier.includes(keyword));
          tableRoomId = found?.id || null;
        } catch { /* ignore */ }
      }
      setContext(r.id, tableRoomId);

      // Fetch categories: exclude service categories for dine-in, include for rooms
      const cats = await api.getCategories(r.id, isRoom ? { serviceOnly: 'true' } : { serviceOnly: 'false' });
      setCategories(cats);
      if (cats.length) setActive(cats[0].id);
    }).finally(() => setLoading(false));
  }, [slug, locationId, legacyTable, legacyRoom, isRoom, setContext]);

  useEffect(() => {
    if (!restaurant?.id || !activeCategory) return;
    api.getMenuItems(restaurant.id, activeCategory).then(setItems).catch(() => setItems([]));
  }, [restaurant?.id, activeCategory]);

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOrderPlaced = useCallback((order) => setOrder(order), [setOrder]);

  if (loading) return (
    <CustomerLayout>
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    </CustomerLayout>
  );

  return (
    <CustomerLayout restaurantName={restaurant?.name} onCartClick={() => setCartOpen(true)}>
      {/* Live order status */}
      <AnimatePresence>
        {currentOrder && !['served', 'cancelled'].includes(currentOrder.status) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-surface border-b border-border overflow-hidden">
            <div className="px-4 pt-3 pb-0">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Live Order Status</p>
            </div>
            <StatusBar currentStatus={currentOrder.status} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-4 pb-2">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" placeholder="Search menu…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          {categories.map((cat) => (
            <button key={cat.id}
              onClick={() => setActive(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95
                ${activeCategory === cat.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface text-body border border-border hover:border-primary/40'}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Item list */}
      <div className="px-4 pb-28 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="text-sm">No items found</p>
          </div>
        ) : (
          filtered.map((item) => <MenuItemCard key={item.id} item={item} />)
        )}
      </div>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onOrderPlaced={handleOrderPlaced} />
    </CustomerLayout>
  );
}
