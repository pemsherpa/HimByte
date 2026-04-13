import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bath, SprayCan, BedDouble, PhoneCall, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';

const SERVICES = [
  { type: 'clean_room', label: 'Clean Room', icon: SprayCan, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { type: 'towels', label: 'Towels', icon: Bath, color: 'bg-teal-50 text-teal-600 border-teal-200' },
  { type: 'dnd', label: 'DND', icon: BedDouble, color: 'bg-gold-soft text-gold-dark border-gold/20' },
  { type: 'other', label: 'Front Desk', icon: PhoneCall, color: 'bg-primary-soft text-primary border-primary/20' },
];

export default function HotelServicesBar({ restaurantId }) {
  const [sent, setSent] = useState({});
  const tableRoomId = useCartStore((s) => s.tableRoomId);
  const sessionId = useCartStore((s) => s.sessionId);

  async function handleRequest(type) {
    if (!restaurantId || sent[type]) return;
    try {
      await api.createServiceRequest({
        restaurant_id: restaurantId,
        table_room_id: tableRoomId,
        session_id: sessionId || undefined,
        service_type: type,
      });
      setSent((s) => ({ ...s, [type]: true }));
      toast.success('Request sent to the front desk!');
      setTimeout(() => setSent((s) => ({ ...s, [type]: false })), 10000);
    } catch (err) {
      toast.error(err.message || 'Failed to send request.');
    }
  }

  return (
    <div className="bg-surface border-b border-border px-4 py-3">
      <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Hotel Services</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {SERVICES.map((svc, i) => (
          <motion.button
            key={svc.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.93 }}
            disabled={sent[svc.type]}
            onClick={() => handleRequest(svc.type)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
              ${svc.color}
              ${sent[svc.type] ? 'opacity-60' : 'hover:shadow-sm active:scale-95'}`}
          >
            {sent[svc.type] ? <CheckCircle size={13} /> : <svc.icon size={13} />}
            {sent[svc.type] ? 'Sent!' : svc.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
