import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bath, SprayCan, BedDouble, PhoneCall, ArrowLeft, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';
import CustomerLayout from '../../components/layout/CustomerLayout';
import toast from 'react-hot-toast';

const SERVICES = [
  { type: 'clean_room', label: 'Clean My Room',    desc: 'Request housekeeping to clean & tidy your room',  icon: SprayCan,    color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { type: 'towels',     label: 'Fresh Towels',      desc: 'Request a fresh set of towels',                   icon: Bath,        color: 'bg-teal-50 text-teal-600 border-teal-100' },
  { type: 'dnd',        label: 'Do Not Disturb',    desc: 'Activate DND — no staff will knock',              icon: BedDouble,   color: 'bg-gold-soft text-gold-dark border-gold/20' },
  { type: 'other',      label: 'Call Front Desk',   desc: 'Anything else — we\'re here to help',             icon: PhoneCall,   color: 'bg-primary-soft text-primary border-primary/20' },
];

export default function ServicesPage() {
  const [searchParams] = useSearchParams();
  const slug    = searchParams.get('r');
  const locId   = searchParams.get('loc');
  const room    = searchParams.get('room');
  const { restaurantId, tableRoomId } = useCartStore();
  const [sent, setSent] = useState({});

  const backPath = `/menu?r=${slug}${locId ? `&loc=${locId}` : room ? `&room=${room}` : ''}`;

  async function handleRequest(type) {
    try {
      await api.createServiceRequest({
        restaurant_id: restaurantId,
        table_room_id: tableRoomId,
        service_type: type,
      });
      setSent((s) => ({ ...s, [type]: true }));
      toast.success('Request sent to the front desk!');
    } catch {
      toast.error('Failed to send request. Please try again.');
    }
  }

  return (
    <CustomerLayout restaurantName="Hotel Services">
      <div className="px-4 py-5">
        <Link to={backPath}
          className="inline-flex items-center gap-1.5 text-sm text-primary font-medium mb-5 hover:underline">
          <ArrowLeft size={15} /> Back to Room Service
        </Link>

        <h2 className="text-xl font-black text-ink mb-1">Hotel Services</h2>
        <p className="text-sm text-muted mb-6">Tap any card to request service instantly.</p>

        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((svc, i) => (
            <motion.button
              key={svc.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => !sent[svc.type] && handleRequest(svc.type)}
              disabled={sent[svc.type]}
              className={`relative bg-surface rounded-2xl p-5 border text-left
                ${svc.color}
                ${sent[svc.type] ? 'opacity-60' : 'hover:shadow-md transition-shadow cursor-pointer'}`}
            >
              {sent[svc.type] && (
                <div className="absolute top-2 right-2">
                  <CheckCircle size={16} className="text-success" />
                </div>
              )}
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-3 ${svc.color}`}>
                <svc.icon size={20} />
              </div>
              <h3 className="font-bold text-ink text-sm">{svc.label}</h3>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{svc.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
