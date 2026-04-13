import { motion } from 'framer-motion';
import { ChefHat, CheckCircle, Clock, Home, UtensilsCrossed, XCircle, ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatOrderClock, getOrderUrgency, URGENCY_STYLES } from '../../lib/orderUrgency';

const STATUS_NEXT = { approved: 'preparing', preparing: 'ready', ready: 'served' };
const STATUS_LABEL = { preparing: 'Start cooking', ready: 'Mark ready', served: 'Mark served' };

function LocationIcon({ type }) {
  if (type === 'room') return <Home size={16} className="opacity-80" />;
  return <UtensilsCrossed size={16} className="opacity-80" />;
}

export default function KdsOrderCard({
  order,
  mode = 'gate',
  onApprove,
  onReject,
  onAdvance,
}) {
  const isPending = order.status === 'pending';
  const { band, mins } = getOrderUrgency(order.created_at);
  const u = URGENCY_STYLES[band];
  const next = STATUS_NEXT[order.status];
  const locType = order.tables_rooms?.type;

  return (
    <motion.div
      layout
      className={`bg-surface rounded-2xl border-2 overflow-hidden shadow-sm ${u.border}`}
    >
      <div className={`px-4 py-3 flex flex-wrap items-start justify-between gap-2 ${u.header}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-ink flex-shrink-0">
            <LocationIcon type={locType} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide">
              {locType === 'room' ? 'Room / guest' : 'Dine in'}
            </p>
            <p className="text-lg font-black text-ink truncate">
              {order.tables_rooms?.identifier || 'Order'}
            </p>
          </div>
          <Badge status={order.status} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.chip}`}>
            {band === 'fresh' ? 'On time' : band === 'warm' ? 'Hurry' : 'Overdue'}
          </span>
          <div className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${u.accent}`}>
            <Clock size={14} />
            <span>{mins} min</span>
            <span className="text-muted font-semibold">· {formatOrderClock(order.created_at)}</span>
          </div>
          <span className="text-sm font-black text-ink">
            Rs. {Number(order.total_price || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 border-b border-border/80 bg-surface">
        <p className="text-[11px] font-bold text-muted uppercase tracking-wide">All items</p>
        <ul className="space-y-2.5">
          {(order.order_items || []).map((oi) => (
            <li
              key={oi.id}
              className="flex items-start gap-3 text-base"
            >
              <span className="min-w-[2.25rem] h-9 rounded-xl bg-primary-soft text-primary font-black flex items-center justify-center text-sm flex-shrink-0">
                {oi.quantity}×
              </span>
              <span className="font-semibold text-ink leading-snug pt-1">
                {oi.menu_items?.name || 'Item'}
              </span>
              <span className="ml-auto text-sm font-bold text-muted tabular-nums pt-1">
                Rs. {(Number(oi.price_at_time) * Number(oi.quantity)).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        {order.notes && (
          <p className="text-sm text-warning font-medium border-t border-border pt-3 mt-1">
            Note: {order.notes}
          </p>
        )}
      </div>

      <div className="px-4 py-4 bg-canvas/80">
        {mode === 'gate' && isPending && (
          <div className="flex gap-2">
            <Button variant="success" className="flex-1 min-h-12 text-base font-bold rounded-2xl" onClick={() => onApprove?.(order.id)}>
              <CheckCircle size={18} /> Approve
            </Button>
            <Button variant="danger" className="min-h-12 px-4 rounded-2xl" onClick={() => onReject?.(order.id)}>
              <XCircle size={18} />
            </Button>
          </div>
        )}
        {mode === 'gate' && !isPending && next && (
          <Button
            variant={next === 'served' ? 'success' : 'gold'}
            className="w-full min-h-12 text-base font-bold rounded-2xl"
            onClick={() => onAdvance?.(order.id, next)}
          >
            <ArrowRight size={18} /> {STATUS_LABEL[next]}
          </Button>
        )}
        {mode === 'kitchen' && next && next !== 'served' && (
          <Button
            variant={next === 'ready' ? 'success' : 'primary'}
            className="w-full min-h-12 text-base font-bold rounded-2xl"
            onClick={() => onAdvance?.(order.id, next)}
          >
            {next === 'ready' ? <CheckCircle size={18} /> : <ChefHat size={18} />}
            {STATUS_LABEL[next]}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
