import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../stores/cartStore';
import useGuestStore from '../../stores/guestStore';
import { api } from '../../lib/api';
import { DEMO_MODE, supabase } from '../../lib/supabase';
import Button from './Button';

export default function CartDrawer({ isOpen, onClose, onOrderPlaced }) {
  const { items, restaurantId, tableRoomId, sessionId, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const { phone: guestPhone, email: guestEmail, verified: guestVerified } = useGuestStore();
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const total = getTotal();

  async function handlePlace() {
    if (!items.length) return;
    if (!DEMO_MODE && supabase && (!guestVerified || !guestPhone || !guestEmail)) {
      toast.error('Please complete guest check-in (phone & email) before ordering.');
      return;
    }
    setPlacing(true);
    try {
      const order = await api.placeOrder({
        restaurant_id: restaurantId,
        table_room_id: tableRoomId,
        session_id: sessionId,
        notes: notes || null,
        guest_phone: !DEMO_MODE && supabase ? guestPhone : undefined,
        guest_email: !DEMO_MODE && supabase ? guestEmail : undefined,
        items: items.map((i) => ({
          menu_item_id: i.menu_item_id,
          price_at_time: i.price_at_time,   // schema field
          quantity: i.quantity,
        })),
      });
      clearCart();
      setNotes('');
      onClose();
      onOrderPlaced?.(order);
      toast.success('Order placed! Awaiting approval.');
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />

          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl z-50 max-h-[88vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={20} className="text-primary" />
                <h2 className="text-base font-bold text-ink">Your Order</h2>
                <span className="bg-primary text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {items.length}
                </span>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
                <X size={18} className="text-muted" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted">
                  <ShoppingBag size={44} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.menu_item_id} className="flex items-center gap-3 bg-canvas rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                      <p className="text-sm font-bold text-primary">
                        Rs. {(item.price_at_time * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:border-primary text-muted hover:text-primary transition-colors">
                        {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                      </button>
                      <span className="text-sm font-bold text-ink w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:border-primary text-muted hover:text-primary transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {items.length > 0 && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions? (e.g. less spicy, no onions)"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted font-medium">Total</span>
                  <span className="text-xl font-black text-ink">Rs. {total.toLocaleString()}</span>
                </div>
                <Button variant="primary" size="lg" className="w-full" onClick={handlePlace} disabled={placing}>
                  {placing ? 'Placing Order…' : `Place Order — Rs. ${total.toLocaleString()}`}
                </Button>
                <p className="text-center text-xs text-muted">
                  Staff approval required before your order is prepared
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
