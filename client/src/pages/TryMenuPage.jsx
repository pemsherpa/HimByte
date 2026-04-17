import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Monitor, Laptop, Play, Sparkles } from 'lucide-react';
import MandalaBackground from '../components/patterns/MandalaBackground';
import LandingFooter from '../components/LandingFooter';
import { api } from '../lib/api';
import { DEMO_MODE } from '../lib/supabase';

const MENU_TABLE = DEMO_MODE ? '/menu?r=himalayan-kitchen&table=1' : '/menu/hotel-tashi-delek?table=T1';

const COUNTRY_CODES = [
  { label: 'Nepal (+977)', value: '+977' },
  { label: 'India (+91)', value: '+91' },
];

function DemoIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto aspect-[4/3]">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-soft via-surface to-gold-soft/40 border border-border shadow-lg overflow-hidden">
        <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-ink text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full shadow-md">
          <Play size={12} className="text-danger fill-current" />
          Live demo
        </div>
        <svg className="absolute bottom-0 left-0 right-0 h-[55%]" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="200" cy="220" rx="160" ry="12" fill="#E2EBF3" opacity="0.6" />
          <rect x="48" y="120" width="120" height="88" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="232" y="132" width="112" height="76" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="68" y="88" width="72" height="48" rx="4" fill="#E8F4FD" stroke="#1B5E8A" strokeWidth="1.2" />
          <rect x="252" y="100" width="64" height="40" rx="4" fill="#FEF5E7" stroke="#B37D0E" strokeWidth="1.2" />
          <circle cx="108" cy="108" r="14" fill="#E8F4FD" stroke="#1B5E8A" strokeWidth="1.2" />
          <circle cx="284" cy="116" r="12" fill="#FEF5E7" stroke="#B37D0E" strokeWidth="1.2" />
          <path d="M140 96 L180 72" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M260 108 L220 84" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M320 40 Q340 60 320 80" stroke="#16A34A" strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M72 52 L88 48 L84 68 Z" fill="#16A34A" opacity="0.35" />
        </svg>
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
          <div className="flex items-center gap-2 text-primary">
            <Monitor size={28} strokeWidth={1.5} />
            <span className="text-xs font-bold uppercase tracking-wider text-success">Request a live demo today!</span>
          </div>
          <Laptop size={26} className="text-gold-dark opacity-80" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

export default function TryMenuPage() {
  const [countryCode, setCountryCode] = useState('+977');
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitDemoRequest({
        restaurant_name: restaurantName,
        owner_name: ownerName,
        owner_email: ownerEmail,
        country_code: countryCode,
        mobile,
        city,
        address,
      });
      setSent(true);
      toast.success('Request sent — we will contact you shortly.');
    } catch (err) {
      toast.error(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md shrink-0" />
          <span className="text-base font-black text-ink truncate">Himbyte</span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-primary hover:underline shrink-0">
          ← Back to home
        </Link>
      </nav>

      <div className="relative flex-1 overflow-hidden min-w-0">
        <MandalaBackground opacity={0.05} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <div className="text-center mb-10 md:mb-12">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-primary mb-3">
              <Sparkles size={18} aria-hidden />
              Live walkthrough
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
              Take a Free Demo
            </h1>
            <p className="text-sm text-muted mt-3 max-w-xl mx-auto">
              Tell us about your venue and we&apos;ll reach out to schedule a walkthrough of Himbyte — QR menus, staff gate, and more.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="bg-surface rounded-2xl border border-border shadow-md p-6 sm:p-8">
              {sent ? (
                <div className="text-center py-8">
                  <p className="text-base font-bold text-ink mb-2">Thank you!</p>
                  <p className="text-sm text-body mb-6">
                    Your details were sent to our team. We&apos;ll contact you soon to arrange your live demo.
                  </p>
                  <Link
                    to={MENU_TABLE}
                    className="inline-flex items-center justify-center w-full sm:w-auto font-bold px-6 py-3 rounded-2xl bg-primary text-white hover:bg-primary-dark transition-colors text-sm"
                  >
                    Open the guest menu while you wait
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="restaurant_name" className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Restaurant name</label>
                    <input
                      id="restaurant_name"
                      name="restaurant_name"
                      required
                      autoComplete="organization"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Your restaurant or hotel name"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner_name" className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Owner name</label>
                    <input
                      id="owner_name"
                      name="owner_name"
                      required
                      autoComplete="name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner_email" className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Owner email</label>
                    <input
                      id="owner_email"
                      name="owner_email"
                      type="email"
                      required
                      autoComplete="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Owner mobile</span>
                    <div className="flex gap-2">
                      <select
                        id="country_code"
                        name="country_code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="shrink-0 rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary max-w-[44%] sm:max-w-[200px]"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="Mobile number"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">City</label>
                    <input
                      id="city"
                      name="city"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="e.g. Kathmandu"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Address</label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      autoComplete="street-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y min-h-[88px]"
                      placeholder="Street, area, landmark"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-success text-white font-bold py-3.5 text-sm hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                  >
                    {loading ? 'Sending…' : 'Submit'}
                  </button>
                </form>
              )}
            </div>

            <div className="flex flex-col items-center lg:items-stretch">
              <DemoIllustration />
              <p className="mt-6 text-center lg:text-left text-lg font-black text-success uppercase tracking-wide">
                Request a live demo today!
              </p>
              <p className="mt-2 text-sm text-body text-center lg:text-left max-w-md">
                No captcha — just your details. We use the same secure channel as our transactional emails (SMTP).
              </p>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
