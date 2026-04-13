import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import useGuestStore from '../../stores/guestStore';
import { useRealtimeCustomerOrder } from '../../hooks/useRealtimeOrders';
import { DEMO_MODE, supabase } from '../../lib/supabase';
import CustomerLayout from '../../components/layout/CustomerLayout';
import MenuItemCard from '../../components/ui/MenuItemCard';
import CartDrawer from '../../components/ui/CartDrawer';
import StatusBar from '../../components/ui/StatusBar';
import GuestGateModal from '../../components/customer/guest-gate-modal';
import CallWaiterBar from '../../components/customer/call-waiter-bar';
import HotelServicesBar from '../../components/customer/hotel-services-bar';
import BillMenuTeaser from '../../components/customer/bill-menu-teaser';
import { matchesLocationIdentifier } from '../../lib/locationMatch';

export default function MenuPage() {
  const { slug: slugParam } = useParams();          // from /menu/:slug
  const [searchParams] = useSearchParams();
  const slug        = slugParam || searchParams.get('r');   // support both formats
  const locationId  = searchParams.get('loc');              // UUID (legacy QR landing)
  const locationKey = searchParams.get('location'); // e.g. T1, R101 (path-based QR)
  const tableParam  = searchParams.get('table');      // ?table=… (id or label)
  const legacyRoom  = searchParams.get('room');

  const [restaurant, setRestaurant]   = useState(null);
  const [categories, setCategories]   = useState([]);
  const [items, setItems]             = useState([]);
  const [activeCategory, setActive]   = useState(null);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(null);
  const [cartOpen, setCartOpen]       = useState(false);

  const setContext   = useCartStore((s) => s.setContext);
  const currentOrder = useOrderStore((s) => s.currentOrder);
  const setOrder     = useOrderStore((s) => s.setCurrentOrder);

  const [locationObj, setLocationObj] = useState(null);

  const sessionId = useCartStore((s) => s.sessionId);
  const guestVerified = useGuestStore((s) => s.verified);
  const hydrateGuest = useGuestStore((s) => s.hydrateForContext);
  const setGuest = useGuestStore((s) => s.setGuest);

  useRealtimeCustomerOrder(sessionId);

  useEffect(() => {
    if (!slug) {
      setLoadError('Missing restaurant. Open the menu from your table QR or pick a demo link on the home page.');
      setLoading(false);
      setRestaurant(null);
      setCategories([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api.getRestaurant(slug).then(async (r) => {
      if (cancelled) return;
      setRestaurant(r);

      // Resolve table_room_id — handles UUID (loc), identifier (location), or legacy params
      let tableRoomId = locationId || null;
      let resolvedLoc = null;

      if (locationKey || tableParam || legacyRoom) {
        try {
          const all = await api.getTablesRooms(r.id);
          const keyword = locationKey || tableParam || legacyRoom;
          resolvedLoc = all.find((t) => matchesLocationIdentifier(t, keyword));
          if (resolvedLoc) tableRoomId = resolvedLoc.id;
        } catch { /* ignore */ }
      } else if (locationId) {
        try {
          const all = await api.getTablesRooms(r.id);
          resolvedLoc = all.find((t) => t.id === locationId);
        } catch { /* ignore */ }
      }

      setLocationObj(resolvedLoc);
      setContext(r.id, tableRoomId);
      hydrateGuest(slug, tableRoomId ?? null);

      const cats = await api.getCategories(r.id);
      const filtered = cats.filter((c) =>
        resolvedLoc?.type === 'room' ? true : !c.is_service_category
      );
      setCategories(filtered);
      if (filtered.length) setActive(filtered[0].id);
    }).catch((err) => {
      if (!cancelled) {
        setLoadError(err.message || 'Restaurant not found or unavailable.');
        setRestaurant(null);
        setCategories([]);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [slug, locationId, locationKey, tableParam, legacyRoom, setContext, hydrateGuest]);

  useEffect(() => {
    if (!restaurant?.id || !activeCategory) return;
    api.getMenuItems(restaurant.id, activeCategory).then(setItems).catch(() => setItems([]));
  }, [restaurant?.id, activeCategory]);

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOrderPlaced = useCallback((order) => setOrder(order), [setOrder]);

  const billQueryString = useMemo(() => {
    const p = new URLSearchParams();
    if (slugParam) p.set('r', slugParam);
    else if (slug) p.set('r', slug);
    if (locationId) p.set('loc', locationId);
    if (locationKey) p.set('location', locationKey);
    if (tableParam) p.set('table', tableParam);
    if (legacyRoom) p.set('room', legacyRoom);
    return p.toString();
  }, [slugParam, slug, locationId, locationKey, tableParam, legacyRoom]);

  if (loading) return (
    <CustomerLayout>
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    </CustomerLayout>
  );

  if (loadError || !restaurant) return (
    <CustomerLayout restaurantName="Menu">
      <div className="px-6 py-16 text-center">
        <p className="text-ink font-bold text-lg mb-2">We couldn&apos;t open this menu</p>
        <p className="text-sm text-muted mb-6">{loadError || 'Unknown error.'}</p>
        <a href="/" className="inline-flex text-sm font-semibold text-primary hover:underline">← Back to home</a>
      </div>
    </CustomerLayout>
  );

  const showGuestGate = !DEMO_MODE && !!supabase && !!restaurant && !guestVerified;

  return (
    <CustomerLayout restaurantName={restaurant?.name} onCartClick={() => setCartOpen(true)}>
      <GuestGateModal
        open={showGuestGate}
        restaurantName={restaurant?.name}
        onContinue={(phone, email) => {
          const tr = useCartStore.getState().tableRoomId;
          setGuest(phone, email, slug, tr ?? null);
        }}
      />

      {/* Call waiter / message staff — always visible */}
      <CallWaiterBar restaurantId={restaurant?.id} />

      {/* Hotel services — only for room QR customers */}
      {locationObj?.type === 'room' && (
        <HotelServicesBar restaurantId={restaurant?.id} />
      )}

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
            {currentOrder.status === 'pending' && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-gold-soft border border-gold/25 flex items-center gap-2">
                <Clock size={16} className="text-gold-dark shrink-0" />
                <p className="text-xs font-semibold text-gold-dark">
                  Waiting for staff approval — your order is not in the kitchen yet and your table bill is not updated until a team member approves.
                </p>
              </div>
            )}
            <StatusBar currentStatus={currentOrder.status} />
          </motion.div>
        )}
      </AnimatePresence>

      <BillMenuTeaser searchString={billQueryString} />

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
