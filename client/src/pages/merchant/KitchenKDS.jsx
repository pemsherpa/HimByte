import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChefHat } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { useRealtimeOrders } from '../../hooks/useRealtimeOrders';
import { useStaffOrdersBootstrap } from '../../hooks/useStaffOrdersBootstrap';
import KdsOrderCard from '../../components/merchant/kds-order-card';
import PendingItemsSummary from '../../components/merchant/pending-items-summary';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { getOrderUrgency, URGENCY_STYLES } from '../../lib/orderUrgency';

function countUrgencyBands(orders) {
  let fresh = 0;
  let warm = 0;
  let hot = 0;
  for (const o of orders || []) {
    const { band } = getOrderUrgency(o.created_at);
    if (band === 'fresh') fresh += 1;
    else if (band === 'warm') warm += 1;
    else hot += 1;
  }
  return { fresh, warm, hot };
}

export default function KitchenKDS() {
  const { activeOrders, updateStatus } = useOrderStore();
  const { restaurantId } = useAuthStore();
  const loading = useStaffOrdersBootstrap(restaurantId);

  useRealtimeOrders(restaurantId);

  const tickets = useMemo(
    () =>
      activeOrders
        .filter((o) => ['approved', 'preparing'].includes(o.status))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [activeOrders],
  );

  const bands = useMemo(() => countUrgencyBands(tickets), [tickets]);
  const uf = URGENCY_STYLES.fresh;
  const uw = URGENCY_STYLES.warm;
  const uh = URGENCY_STYLES.hot;

  async function handleAdvance(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      updateStatus(orderId, status);
      const msg = { preparing: 'Cooking started!', ready: 'Marked ready for service!' };
      toast.success(msg[status] || 'Updated');
    } catch {
      toast.error('Failed to update ticket');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-sm">
            <ChefHat size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">Kitchen display</h1>
            <p className="text-sm text-muted">{tickets.length} active ticket{tickets.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card className="p-4 min-h-[88px] flex flex-col justify-center">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide">In kitchen</p>
          <p className="text-2xl font-black text-primary">{tickets.length}</p>
        </Card>
        <Card className={`p-4 col-span-2 lg:col-span-3 ${uf.header} border border-border rounded-2xl`}>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Ticket age</p>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${uf.chip}`}>Green under 5 min · {bands.fresh}</span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${uw.chip}`}>Yellow 5–9 min · {bands.warm}</span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${uh.chip}`}>Red 10+ min · {bands.hot}</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-col xl:flex-row gap-5 xl:items-start">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {tickets.map((t) => (
                <KdsOrderCard key={t.id} order={t} mode="kitchen" onAdvance={handleAdvance} />
              ))}
            </AnimatePresence>
          </div>
          {!loading && tickets.length === 0 && (
            <div className="text-center py-16 text-muted">
              <ChefHat size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">Kitchen is clear — no active tickets</p>
            </div>
          )}
        </div>
        <aside className="w-full xl:w-96 xl:shrink-0 xl:sticky xl:top-4">
          <PendingItemsSummary orders={tickets} title="Pending item summary" />
        </aside>
      </div>
    </div>
  );
}
