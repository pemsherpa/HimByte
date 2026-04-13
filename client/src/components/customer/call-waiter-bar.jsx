import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Hand, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';

const QUICK_ACTIONS = [
  { type: 'call_waiter', label: 'Call Waiter', icon: Hand },
  { type: 'need_menu', label: 'Need Help', icon: MessageSquare },
];

export default function CallWaiterBar({ restaurantId }) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentActions, setSentActions] = useState({});
  const tableRoomId = useCartStore((s) => s.tableRoomId);
  const sessionId = useCartStore((s) => s.sessionId);

  async function sendRequest(type, notes) {
    if (!restaurantId) return;
    setSending(true);
    try {
      await api.createServiceRequest({
        restaurant_id: restaurantId,
        table_room_id: tableRoomId,
        session_id: sessionId || undefined,
        service_type: type,
        notes: notes || null,
      });
      setSentActions((s) => ({ ...s, [type]: true }));
      if (type === 'message') {
        setMessage('');
        setExpanded(false);
      }
      toast.success(type === 'message' ? 'Message sent to staff!' : 'Staff has been notified!');
      setTimeout(() => setSentActions((s) => ({ ...s, [type]: false })), 8000);
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-surface border-b border-border">
      <div className="px-4 py-2.5 flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.type}
              disabled={sentActions[action.type] || sending}
              onClick={() => sendRequest(action.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95
                ${sentActions[action.type]
                  ? 'bg-success-soft text-success border border-success/20'
                  : 'bg-primary-soft text-primary border border-primary/20 hover:bg-primary/10'}`}
            >
              {sentActions[action.type]
                ? <CheckCircle size={13} />
                : <action.icon size={13} />
              }
              {sentActions[action.type] ? 'Sent!' : action.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-body border border-border hover:bg-canvas transition-colors"
        >
          <MessageSquare size={13} />
          Message
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && message.trim()) sendRequest('message', message.trim());
                }}
                placeholder="Type a message for staff…"
                className="flex-1 px-3 py-2 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                disabled={!message.trim() || sending}
                onClick={() => sendRequest('message', message.trim())}
                className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 active:scale-95"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
