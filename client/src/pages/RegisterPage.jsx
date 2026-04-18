import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Eye, EyeOff, AlertCircle, ArrowRight, Phone } from 'lucide-react';
import MandalaBackground from '../components/patterns/MandalaBackground';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { DEMO_MODE } from '../lib/supabase';

function slugPreview(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'your-restaurant';
}

export default function RegisterPage() {
  const [restaurantName, setRestaurantName] = useState('');
  const [slugHint, setSlugHint] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [venueType, setVenueType] = useState('restaurant');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vatPan, setVatPan] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (DEMO_MODE) {
      toast.error('Registration is disabled in demo mode (no Supabase).');
      return;
    }
    setLoading(true);
    try {
      const res = await api.registerRestaurantOwner({
        email,
        password,
        restaurant_name: restaurantName.trim(),
        slug: slugHint.trim() || undefined,
        owner_name: ownerName.trim(),
        venue_type: venueType,
        phone: phone.trim(),
        address: address.trim() || undefined,
        vat_pan_number: vatPan.trim() || undefined,
      });
      toast.success(res?.message || 'Application submitted.');
      setRestaurantName('');
      setSlugHint('');
      setOwnerName('');
      setPhone('');
      setAddress('');
      setVatPan('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <MandalaBackground opacity={0.05} className="z-0" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md min-w-0 relative z-10"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Building2 className="text-ink" size={26} />
          </div>
          <h1 className="text-2xl font-black text-ink">List your restaurant</h1>
          <p className="text-sm text-muted mt-1">
            Submit your details for review. After Himbyte approves your application, you can sign in and set up your venue.
          </p>
        </div>

        {DEMO_MODE && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-primary-soft border border-primary/20 text-sm text-primary flex gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            Demo mode has no database — use the live app with Supabase to register a real venue.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Restaurant name</label>
            <input
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Ohana Cafe"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[11px] text-muted mt-1">Public URL slug will look like: himbyte.com/menu/<span className="font-mono text-body">{slugPreview(slugHint || restaurantName)}</span></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Venue type</label>
            <select
              value={venueType}
              onChange={(e) => setVenueType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="restaurant">Restaurant / cafe</option>
              <option value="hotel">Hotel / lodge (rooms + F&amp;B)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Custom slug (optional)</label>
            <input
              value={slugHint}
              onChange={(e) => setSlugHint(e.target.value)}
              placeholder="Leave blank to auto-generate from name"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Your name</label>
            <input
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Owner / manager name"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Mobile number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9841XXXXXX"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-canvas text-base text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <p className="text-[11px] text-muted mt-1">For account and order notifications.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Work email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Business address (optional)</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city — helps us verify your venue"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[72px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">VAT / PAN (optional)</label>
            <input
              value={vatPan}
              onChange={(e) => setVatPan(e.target.value)}
              placeholder="Nepal IRD registration number if you have one"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Password</label>
            <div className="relative">
              <input
                required
                type={showPass ? 'text' : 'password'}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1">Minimum 8 characters. You&apos;ll use this to manage menus, staff, and orders.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-danger bg-danger-soft px-3 py-2.5 rounded-xl">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || DEMO_MODE}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <>Submit application <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
