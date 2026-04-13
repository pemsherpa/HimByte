import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidNpPhone(v) {
  const d = v.replace(/\D/g, '');
  return d.length >= 9 && d.length <= 15;
}

export default function GuestGateModal({ open, restaurantName, onContinue }) {
  const [phone, setPhone] = useState('');
  const [email, setEmail]   = useState('');
  const [err, setErr]       = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!isValidNpPhone(phone)) {
      setErr('Enter a valid mobile number (with or without country code).');
      return;
    }
    if (!isValidEmail(email)) {
      setErr('Enter a valid email address.');
      return;
    }
    onContinue(phone, email);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden"
          >
            <div className="bg-primary-soft px-6 py-4 border-b border-primary/15 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Guest check-in</p>
                <h2 className="text-lg font-black text-ink leading-tight">{restaurantName || 'Restaurant'}</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-sm text-body leading-relaxed">
                No password needed. We use your phone and email so staff can reach you about your order and you can see live status on this device.
              </p>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Mobile number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="e.g. 9841XXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {err && <p className="text-sm text-danger font-medium">{err}</p>}

              <Button type="submit" variant="primary" size="lg" className="w-full">
                Continue to menu <ArrowRight size={16} className="inline ml-1" />
              </Button>

              <p className="text-[11px] text-muted text-center leading-relaxed">
                By continuing you agree we may contact you about this visit. Restaurant staff manage your order and bill.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
