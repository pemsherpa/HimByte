import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChefHat, Clock, Check, Flame } from 'lucide-react';
import { api } from '../../lib/api';
import { DEMO_RESTAURANT_ID } from '../../lib/constants';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

function KDSTicket({ order, onAdvance }) {
  const elapsed  = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent = elapsed > 15;
  const isLate   = elapsed > 25;
  const next     = order.status === 'approved' ? 'preparing' : order.status === 'preparing' ? 'ready' : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-surface rounded-2xl border overflow-hidden
        ${isLate   ? 'border-danger shadow-danger/10 shadow-md' :
          isUrgent ? 'border-warning' : 'border-border'}`}>

      {/* Ticket header */}
      <div className={`px-4 py-2.5 flex items-center justify-between
        ${order.status === 'preparing' ? 'bg-orange-50' : 'bg-canvas'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-ink">{order.tables_rooms?.identifier || '#'}</span>
          <Badge status={order.status} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold ${isLate ? 'text-danger' : isUrgent ? 'text-warning' : 'text-muted'}`}>
          {isLate && <Flame size={11} className="text-danger" />}
          <Clock size={11} />
          {elapsed}m
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {order.order_items?.map((oi) => (
          <div key={oi.id} className="flex items-start gap-2.5">
            <span className="w-7 h-7 bg-primary-soft rounded-lg flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
              {oi.quantity}
            </span>
            <span className="text-sm font-medium text-ink leading-snug">{oi.menu_items?.name || 'Item'}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-warning italic border-t border-border pt-2 mt-2">
            ⚠ {order.notes}
          </p>
        )}
      </div>

      {/* Action */}
      {next && (
        <div className="px-4 pb-4">
          <Button variant={next === 'ready' ? 'success' : 'primary'} size="sm" className="w-full"
            onClick={() => onAdvance(order.id, next)}>
            {next === 'ready' ? <Check size={15} /> : <ChefHat size={15} />}
            {next === 'preparing' ? 'Start Cooking' : 'Mark Ready'}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function KitchenKDS() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRestaurantOrders(DEMO_RESTAURANT_ID)
      .then((all) => setTickets(all.filter((o) => ['approved', 'preparing'].includes(o.status))))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdvance(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      if (status === 'ready') {
        setTickets((t) => t.filter((o) => o.id !== orderId));
        toast.success('Order ready for service!');
      } else {
        setTickets((t) => t.map((o) => o.id === orderId ? { ...o, status } : o));
        toast.success('Cooking started!');
      }
    } catch { toast.error('Failed to update ticket'); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <ChefHat size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-ink">Kitchen Display</h1>
          <p className="text-sm text-muted">{tickets.length} active ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {tickets.map((t) => <KDSTicket key={t.id} order={t} onAdvance={handleAdvance} />)}
        </AnimatePresence>
      </div>

      {!loading && tickets.length === 0 && (
        <div className="text-center py-16 text-muted">
          <ChefHat size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Kitchen is clear — no active tickets</p>
        </div>
      )}
    </div>
  );
}
