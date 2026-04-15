import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle, ChefHat, Clock, Hand, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { useStaffOrdersBootstrap } from '../../hooks/useStaffOrdersBootstrap';
import { useGuestRequestsInbox } from '../../hooks/useGuestRequestsInbox';
import KdsOrderCard from '../../components/merchant/kds-order-card';
import PendingItemsSummary from '../../components/merchant/pending-items-summary';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { getOrderUrgency, URGENCY_STYLES, formatOrderClock } from '../../lib/orderUrgency';

function serviceRequestTitle(type) {
  const m = {
    call_waiter: 'Call waiter',
    need_menu: 'Need help',
    message: 'Guest message',
    clean_room: 'Clean room',
    towels: 'Towels',
    dnd: 'Do not disturb',
    other: 'Front desk',
  };
  return m[type] || type || 'Guest request';
}

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

export default function OrderGate() {
  const { pendingOrders, activeOrders, moveToActive, removeFromPending, updateStatus } = useOrderStore();
  const { restaurantId } = useAuthStore();
  const loading = useStaffOrdersBootstrap(restaurantId);
  const { items: guestRequests, reload: reloadGuestRequests } = useGuestRequestsInbox(restaurantId);

  const sortedGuestRequests = useMemo(() => {
    const list = [...(guestRequests || [])];
    list.sort((a, b) => {
      const ah = a.urgency === 'high' ? 1 : 0;
      const bh = b.urgency === 'high' ? 1 : 0;
      if (bh !== ah) return bh - ah;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    return list;
  }, [guestRequests]);

  async function handleGuestRequestDone(id) {
    try {
      await api.updateServiceRequestStatus(id, 'completed');
      toast.success('Request marked done');
      reloadGuestRequests();
    } catch {
      toast.error('Could not update request');
    }
  }

  async function handleApprove(orderId) {
    try {
      await api.updateOrderStatus(orderId, 'approved');
      moveToActive(orderId);
      toast.success('Order approved — sent to kitchen!');
    } catch {
      toast.error('Failed to approve order');
    }
  }

  async function handleReject(orderId) {
    try {
      await api.updateOrderStatus(orderId, 'cancelled');
      removeFromPending(orderId);
      toast('Order rejected', { icon: '❌' });
    } catch {
      toast.error('Failed to reject order');
    }
  }

  async function handleAdvance(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      updateStatus(orderId, status);
      const msg = { preparing: 'Cooking started!', ready: 'Order ready for pickup!', served: 'Order served ✓' };
      toast.success(msg[status] || `Moved to ${status}`);
    } catch {
      toast.error('Failed to update order');
    }
  }

  const totalPending = pendingOrders.length;
  const inKitchen = activeOrders.filter((o) => ['approved', 'preparing', 'ready'].includes(o.status)).length;
  const allForSummary = useMemo(() => [...pendingOrders, ...activeOrders], [pendingOrders, activeOrders]);
  const bands = useMemo(() => countUrgencyBands(allForSummary), [allForSummary]);
  const uf = URGENCY_STYLES.fresh;
  const uw = URGENCY_STYLES.warm;
  const uh = URGENCY_STYLES.hot;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-black text-ink">Order Gate</h1>
        <p className="text-sm text-muted mt-0.5">Approve incoming orders and track the kitchen queue.</p>
      </div>

      {sortedGuestRequests.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Hand size={18} className="text-gold-dark" />
            <h2 className="font-black text-ink text-base">Guest requests</h2>
            <span className="bg-gold text-ink text-xs px-2.5 py-0.5 rounded-full font-black animate-status-pulse">
              {sortedGuestRequests.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedGuestRequests.map((r) => {
              const { band } = getOrderUrgency(r.created_at);
              const st = URGENCY_STYLES[band];
              const high = r.urgency === 'high';
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border-2 overflow-hidden bg-surface ${high ? 'border-gold shadow-md ring-2 ring-gold/25' : `${st.border} border-2`}`}
                >
                  <div className={`px-4 py-2 flex items-center justify-between gap-2 ${st.header}`}>
                    <span className="text-xs font-black text-ink flex items-center gap-1.5">
                      {r.service_type === 'message' ? <MessageSquare size={14} /> : <Hand size={14} />}
                      {serviceRequestTitle(r.service_type)}
                      {high && (
                        <span className="text-[10px] font-bold uppercase bg-gold/90 text-ink px-1.5 py-0.5 rounded-lg">
                          Urgent
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-muted">{formatOrderClock(r.created_at)}</span>
                  </div>
                  <div className="px-4 py-3 border-t border-border">
                    <p className="text-sm text-body">
                      <span className="text-muted">Table:</span>{' '}
                      <span className="font-semibold text-ink">{r.tables_rooms?.identifier || '—'}</span>
                    </p>
                    {r.notes && <p className="text-sm text-body mt-1">{r.notes}</p>}
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="gold"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleGuestRequestDone(r.id)}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card className="p-4 flex flex-col justify-center min-h-[88px]">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide">Incoming</p>
          <p className="text-2xl font-black text-ink">{totalPending}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center min-h-[88px]">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide">In kitchen</p>
          <p className="text-2xl font-black text-primary">{inKitchen}</p>
        </Card>
        <Card className={`p-4 col-span-2 lg:col-span-2 ${uf.header} border border-border rounded-2xl`}>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Wait time (queue)</p>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${uf.chip}`}>Green under 5 min · {bands.fresh}</span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${uw.chip}`}>Yellow 5–9 min · {bands.warm}</span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${uh.chip}`}>Red 10+ min · {bands.hot}</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-col xl:flex-row gap-5 xl:items-start">
        <div className="flex-1 min-w-0 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-gold-dark" />
              <h2 className="font-black text-ink text-base">Incoming orders</h2>
              {totalPending > 0 && (
                <span className="bg-gold text-ink text-xs px-2.5 py-0.5 rounded-full font-black animate-status-pulse">
                  {totalPending}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 min-[1100px]:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {pendingOrders.map((o) => (
                  <KdsOrderCard
                    key={o.id}
                    order={o}
                    mode="gate"
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onAdvance={handleAdvance}
                  />
                ))}
              </AnimatePresence>
            </div>
            {!loading && pendingOrders.length === 0 && (
              <Card className="p-10 text-center text-muted">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">All orders handled!</p>
              </Card>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <ChefHat size={18} className="text-primary" />
              <h2 className="font-black text-ink text-base">Active orders</h2>
              <span className="text-xs text-muted font-medium">{activeOrders.length} in progress</span>
            </div>
            <div className="grid grid-cols-1 min-[1100px]:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {activeOrders.map((o) => (
                  <KdsOrderCard
                    key={o.id}
                    order={o}
                    mode="gate"
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onAdvance={handleAdvance}
                  />
                ))}
              </AnimatePresence>
            </div>
            {!loading && activeOrders.length === 0 && (
              <Card className="p-10 text-center text-muted">
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No active orders</p>
              </Card>
            )}
          </section>
        </div>

        <aside className="w-full xl:w-96 xl:shrink-0 xl:sticky xl:top-4">
          <PendingItemsSummary orders={allForSummary} title="Pending item summary" />
        </aside>
      </div>
    </div>
  );
}
