import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, TrendingUp, Clock, CheckCircle, ArrowRight, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function MerchantDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [openGuestRequests, setOpenGuestRequests] = useState(null);
  const { restaurantId, profile } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    Promise.all([
      api.getRestaurantAnalytics(restaurantId).catch(() => null),
      api.getRestaurantOrders(restaurantId).catch(() => []),
    ]).then(([a, orders]) => {
      if (cancelled) return;
      setAnalytics(a);
      const list = orders || [];
      list.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
      setRecentOrders(list.slice(0, 5));
    });
    return () => { cancelled = true; };
  }, [restaurantId, location.pathname, location.key]);

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
