import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle, ChefHat, Clock, Eye, XCircle, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { DEMO_RESTAURANT_ID } from '../../lib/constants';
import { useOrderStore } from '../../stores/orderStore';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

const STATUS_NEXT = { approved: 'preparing', preparing: 'ready', ready: 'served' };
const STATUS_LABEL = { preparing: 'Start Cooking', ready: 'Mark Ready', served: 'Mark Served' };

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function OrderCard({ order, onApprove, onReject, onAdvance, isPending }) {
  const [expanded, setExpanded] = useState(false);
  const next = STATUS_NEXT[order.status];
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isLate  = elapsed > 15;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Card className={`overflow-hidden ${isPending ? 'border-l-4 border-l-gold' : ''} ${isLate && !isPending ? 'border-l-4 border-l-danger' : ''}`}>
        {/* Header */}
        <div className={`px-4 py-2.5 flex items-center justify-between
          ${isPending ? 'bg-gold-soft' : 'bg-canvas'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">
              {order.tables_rooms?.identifier || 'Order'}
            </span>
            <Badge status={order.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${isLate ? 'text-danger' : 'text-muted'}`}>
              <Clock size={11} className="inline mr-0.5" />{timeAgo(order.created_at)}
            </span>
            <span className="text-sm font-black text-ink">Rs. {Number(order.total_price).toLocaleString()}</span>
          </div>
        </div>

        {/* Items toggle */}
        <div className="px-4 pt-2">
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary font-medium mb-2 hover:underline">
            <Eye size={11} /> {expanded ? 'Hide' : 'Show'} {order.order_items?.length || 0} items
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-canvas rounded-xl p-3 mb-3 space-y-1.5">
                  {order.order_items?.map((oi) => (
                    <div key={oi.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink">
                        <span className="font-bold text-primary">{oi.quantity}×</span>{' '}
                        {oi.menu_items?.name || 'Item'}
                      </span>
                      <span className="text-muted">Rs. {(oi.price_at_time * oi.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-warning italic pt-1.5 border-t border-border">
                      Note: {order.notes}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          {isPending ? (
            <>
              <Button variant="success" size="sm" className="flex-1" onClick={() => onApprove(order.id)}>
                <CheckCircle size={15} /> Approve
              </Button>
              <Button variant="danger" size="sm" onClick={() => onReject(order.id)}>
                <XCircle size={15} />
              </Button>
            </>
          ) : next ? (
            <Button variant={next === 'served' ? 'success' : 'gold'} size="sm" className="flex-1"
              onClick={() => onAdvance(order.id, next)}>
              <ArrowRight size={15} /> {STATUS_LABEL[next]}
            </Button>
          ) : null}
        </div>
      </Card>
    </motion.div>
  );
}

export default function OrderGate() {
  const { pendingOrders, activeOrders, setPendingOrders, setActiveOrders, moveToActive, removeFromPending, updateStatus } = useOrderStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRestaurantOrders(DEMO_RESTAURANT_ID, 'pending'),
      api.getRestaurantOrders(DEMO_RESTAURANT_ID),
    ]).then(([pending, all]) => {
      setPendingOrders(pending);
      setActiveOrders(all.filter((o) => ['approved', 'preparing', 'ready'].includes(o.status)));
    }).catch(() => toast.error('Failed to load orders')).finally(() => setLoading(false));
  }, [setPendingOrders, setActiveOrders]);

  async function handleApprove(orderId) {
    try {
      await api.updateOrderStatus(orderId, 'approved');
      moveToActive(orderId);
      toast.success('Order approved — sent to kitchen!');
    } catch { toast.error('Failed to approve order'); }
  }

  async function handleReject(orderId) {
    try {
      await api.updateOrderStatus(orderId, 'cancelled');
      removeFromPending(orderId);
      toast('Order rejected', { icon: '❌' });
    } catch { toast.error('Failed to reject order'); }
  }

  async function handleAdvance(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      updateStatus(orderId, status);
      const msg = { preparing: 'Cooking started!', ready: 'Order ready for pickup!', served: 'Order served ✓' };
      toast.success(msg[status] || `Moved to ${status}`);
    } catch { toast.error('Failed to update order'); }
  }

  const totalPending = pendingOrders.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Order Gate</h1>
        <p className="text-sm text-muted mt-0.5">Approve incoming orders and track the kitchen queue.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Incoming / Pending ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={17} className="text-gold-dark" />
            <h2 className="font-bold text-ink text-sm">Incoming Orders</h2>
            {totalPending > 0 && (
              <span className="bg-gold text-ink text-xs px-2 py-0.5 rounded-full font-black animate-status-pulse">
                {totalPending}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingOrders.map((o) => (
                <OrderCard key={o.id} order={o} isPending onApprove={handleApprove} onReject={handleReject} onAdvance={handleAdvance} />
              ))}
            </AnimatePresence>
            {!loading && pendingOrders.length === 0 && (
              <Card className="p-8 text-center text-muted">
                <CheckCircle size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">All orders handled!</p>
              </Card>
            )}
          </div>
        </div>

        {/* ── Right: Active Orders ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ChefHat size={17} className="text-primary" />
            <h2 className="font-bold text-ink text-sm">Active Orders</h2>
            <span className="text-xs text-muted">{activeOrders.length} in progress</span>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {activeOrders.map((o) => (
                <OrderCard key={o.id} order={o} onApprove={handleApprove} onReject={handleReject} onAdvance={handleAdvance} />
              ))}
            </AnimatePresence>
            {!loading && activeOrders.length === 0 && (
              <Card className="p-8 text-center text-muted">
                <Clock size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active orders</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
