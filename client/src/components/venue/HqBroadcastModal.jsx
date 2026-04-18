import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { api } from '../../lib/api';
import { DEMO_MODE } from '../../lib/supabase';

/**
 * Shows the latest undismissed Himbyte HQ broadcast as a modal (merchant shell).
 */
export default function HqBroadcastModal() {
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    let cancelled = false;
    api
      .getVenueNotifications()
      .then((d) => {
        if (!cancelled && d.popup) setPopup(d.popup);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function dismiss() {
    if (!popup?.id) return;
    try {
      await api.dismissVenueNotificationPopup(popup.id);
      setPopup(null);
    } catch {
      setPopup(null);
    }
  }

  async function dismissAndRead() {
    if (!popup?.id) return;
    try {
      await api.markVenueNotificationRead(popup.id);
      setPopup(null);
    } catch {
      setPopup(null);
    }
  }

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 bg-primary-soft/30">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Bell className="text-primary" size={18} />
                </div>
                <h2 className="font-black text-ink text-sm leading-snug line-clamp-2">{popup.title}</h2>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="p-2 rounded-xl text-muted hover:text-ink hover:bg-canvas-dark flex-shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
              <p className="text-sm text-body whitespace-pre-wrap">{popup.body}</p>
              {popup.created_at && (
                <p className="text-[10px] text-muted mt-3">{new Date(popup.created_at).toLocaleString()}</p>
              )}
            </div>
            <div className="px-5 py-4 flex flex-col sm:flex-row gap-2 border-t border-border bg-canvas-dark/60">
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold text-ink hover:bg-canvas-dark"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={dismissAndRead}
                className="flex-1 py-2.5 rounded-xl bg-gold text-ink text-sm font-bold hover:bg-gold-light"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
