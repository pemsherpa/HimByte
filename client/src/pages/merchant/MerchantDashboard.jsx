import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, TrendingUp, Clock, CheckCircle, ArrowRight, Bell,
  Building2, Phone, MapPin, Receipt, BadgeCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { supabase, DEMO_MODE } from '../../lib/supabase';

const CHIME_FREQUENCY = 880;
const CHIME_DURATION = 0.3;

function playNotificationChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(CHIME_FREQUENCY, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(CHIME_FREQUENCY * 1.25, audioCtx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(CHIME_FREQUENCY * 1.5, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + CHIME_DURATION);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + CHIME_DURATION);
  } catch {
    // ignore
  }
}

export default function MerchantDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [openGuestRequests, setOpenGuestRequests] = useState(null);
  const [venue, setVenue] = useState(null);
  const { restaurantId, profile } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;

    const load = () => Promise.all([
      api.getRestaurantAnalytics(restaurantId).catch(() => null),
      api.getRestaurantOrders(restaurantId).catch(() => []),
      api.getRestaurantOrders(restaurantId, 'pending').catch(() => []),
    ]).then(([a, orders, pending]) => {
      if (cancelled) return;
      setAnalytics(a);
      setPendingApprovalCount((pending || []).length);
      const list = orders || [];
      list.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
      setRecentOrders(list.slice(0, 5));
    });

    load();
    return () => { cancelled = true; };
  }, [restaurantId, location.pathname, location.key]);

  useEffect(() => {
    if (!restaurantId || DEMO_MODE) {
      setVenue(null);
      return;
    }
    api
      .getRestaurantById(restaurantId)
      .then(setVenue)
      .catch(() => setVenue(null));
  }, [restaurantId]);

  // Realtime: keep dashboard fresh + play chime on new incoming orders
  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;
    let t;
    const debounced = (fn) => {
      clearTimeout(t);
      t = setTimeout(fn, 250);
    };

    const channel = supabase
      .channel(`merchant-dashboard:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.new?.status === 'pending' && payload.old == null) {
            playNotificationChime();
          }
          debounced(() => {
            api.getRestaurantAnalytics(restaurantId).then(setAnalytics).catch(() => {});
            api.getRestaurantOrders(restaurantId)
              .then((orders) => {
                const list = orders || [];
                list.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
                setRecentOrders(list.slice(0, 5));
              })
              .catch(() => {});
            api.getRestaurantOrders(restaurantId, 'pending')
              .then((p) => setPendingApprovalCount((p || []).length))
              .catch(() => {});
          });
        },
      )
      .subscribe();

    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    api
      .getServiceRequests(restaurantId)
      .then((list) => {
        const n = (list || []).filter(
          (r) => r.status === 'requested' || r.status === 'in_progress',
        ).length;
        setOpenGuestRequests(n);
      })
      .catch(() => setOpenGuestRequests(0));
  }, [restaurantId]);

  const stats = analytics ? [
    { label: 'Orders Today', value: analytics.orders_today ?? 0, icon: ClipboardList, color: 'bg-primary-soft text-primary' },
    { label: 'Revenue Today', value: `Rs. ${Number(analytics.revenue_today ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-gold-soft text-gold-dark' },
    { label: 'Avg. Order', value: `Rs. ${analytics.avg_order_value}`, icon: Clock, color: 'bg-primary-soft text-primary' },
    { label: 'Completion Rate', value: `${analytics.completion_rate}%`, icon: CheckCircle, color: 'bg-success-soft text-success' },
  ] : [];

  if (!restaurantId) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-black text-ink">Dashboard</h1>
        <p className="mt-3 text-sm text-body">
          No restaurant is linked to this account yet. Sign out and sign in again, or ask an admin to attach your profile to a venue in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Dashboard</h1>
        <p className="text-sm text-muted mt-0.5">
          {profile?.full_name?.replace(' Admin', '').replace(' Staff', '') || 'Restaurant'}
          {' · '}
          <span className="text-ink/80">{profile?.role === 'restaurant_admin' ? 'Owner' : 'Staff'} view</span>
          {' — '}today&apos;s overview
        </p>
      </div>

      {venue && (
        <Card className="p-5 mb-6 border-primary/15 bg-primary-soft/20">
          <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            Your venue
            <span className="text-xs font-medium text-muted normal-case">
              ({venue.venue_type === 'hotel' ? 'Hotel / lodge' : 'Restaurant'})
            </span>
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted mb-0.5">Registered name</dt>
              <dd className="font-semibold text-ink">{venue.name}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted mb-0.5">Public slug</dt>
              <dd className="font-mono text-body text-sm">/menu/{venue.slug}</dd>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={15} className="text-muted shrink-0 mt-0.5" />
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted mb-0.5">Phone</dt>
                <dd className="text-ink">{venue.phone || '—'}</dd>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-start gap-2">
              <MapPin size={15} className="text-muted shrink-0 mt-0.5" />
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted mb-0.5">Address</dt>
                <dd className="text-body whitespace-pre-wrap">{venue.address || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Receipt size={15} className="text-muted shrink-0 mt-0.5" />
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted mb-0.5">VAT / PAN</dt>
                <dd className="font-mono text-ink">{venue.vat_pan_number || '—'}</dd>
              </div>
            </div>
            {(venue.subscription_status || venue.subscription_plan) && (
              <div className="flex items-start gap-2 lg:col-span-3">
                <BadgeCheck size={15} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted mb-0.5">Subscription</dt>
                  <dd className="text-body">
                    <span className="font-semibold text-ink capitalize">{venue.subscription_status || '—'}</span>
                    {venue.subscription_plan && (
                      <span className="text-muted"> · Plan: {venue.subscription_plan}</span>
                    )}
                    {venue.trial_ends_at && (
                      <span className="block text-xs text-muted mt-0.5">
                        Trial / renewal reference: {new Date(venue.trial_ends_at).toLocaleDateString()}
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted font-medium">{s.label}</p>
                  <p className="text-xl font-black text-ink mt-1">{s.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon size={18} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Link
          to="/merchant/orders"
          className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition-colors ${pendingApprovalCount > 0 ? 'border-gold bg-gold-soft/40 shadow-sm' : 'border-border bg-surface hover:border-primary/25'}`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Order gate</p>
            <p className="text-lg font-black text-ink">
              {pendingApprovalCount} <span className="text-sm font-semibold text-body">awaiting approval</span>
            </p>
          </div>
          <ArrowRight className="text-primary shrink-0" size={18} />
        </Link>
        <Link
          to="/merchant/receipts"
          className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between gap-3 hover:border-primary/25 transition-colors"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Receipts (VAT) · today</p>
            <p className="text-lg font-black text-ink tabular-nums">
              Rs. {Number(analytics?.receipts_today_total ?? 0).toLocaleString()}
              <span className="text-xs font-medium text-muted ml-2">{analytics?.receipts_today_count ?? 0} slips</span>
            </p>
          </div>
          <ArrowRight className="text-primary shrink-0" size={18} />
        </Link>
      </div>

      <Link to="/merchant/guest-requests" className="block mb-6">
        <Card className="p-4 flex flex-wrap items-center justify-between gap-4 border-primary/25 bg-primary-soft/30 hover:bg-primary-soft/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Guest requests</p>
              <p className="text-xs text-muted">Hotel services, call waiter, and messages from QR guests</p>
            </div>
          </div>
          <span className="text-sm font-bold text-primary flex items-center gap-1">
            {openGuestRequests === null ? '…' : openGuestRequests > 0 ? `${openGuestRequests} open` : 'Open inbox'}
            <ArrowRight size={14} />
          </span>
        </Card>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent orders */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-ink text-sm">Recent Orders</h2>
            <Link to="/merchant/orders" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted">No orders yet</p>
            ) : recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-soft rounded-xl flex items-center justify-center text-xs font-bold text-primary">
                    {order.tables_rooms?.identifier?.split(' ').map(w => w[0]).join('') || '#'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{order.tables_rooms?.identifier || '—'}</p>
                    <p className="text-xs text-muted">{order.order_items?.length} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-ink">Rs. {Number(order.total_price).toLocaleString()}</span>
                  <Badge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Popular items */}
        {analytics?.popular_items?.some((x) => x.name && x.name !== '—') && (
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-ink text-sm">Top ordered items</h2>
            </div>
            <div className="divide-y divide-border">
              {analytics.popular_items.filter((x) => x.name && x.name !== '—').map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-7 h-7 bg-gold-soft text-gold-dark rounded-xl flex items-center justify-center text-xs font-black">
                    #{i + 1}
                  </div>
                  <p className="text-sm font-semibold text-ink flex-1">{item.name}</p>
                  <span className="text-xs text-muted">{item.orders} orders</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
