import { Link } from 'react-router-dom';
import {
  QrCode,
  ArrowRight,
  Mountain,
  Utensils,
  Hotel,
  CheckCircle,
  ShieldCheck,
  Radio,
  Lock,
  BarChart3,
  MonitorSmartphone,
  Cloud,
  Wallet,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import MandalaBackground from '../components/patterns/MandalaBackground';
import LandingFooter from '../components/LandingFooter';
import { DEMO_MODE } from '../lib/supabase';

const FEATURES = [
  { icon: QrCode,           color: 'bg-primary-soft text-primary',    title: 'QR ordering',          desc: 'Guests scan, browse, and order from their phone — no app install.' },
  { icon: Utensils,         color: 'bg-gold-soft text-gold-dark',       title: 'Staff approval gate',  desc: 'Orders stay pending until staff approve — full control before the kitchen.' },
  { icon: Hotel,            color: 'bg-success-soft text-success',      title: 'Hotel concierge',      desc: 'Room requests, towels, DND — unified with the same QR journey.' },
  { icon: Radio,            color: 'bg-primary-soft text-primary',      title: 'Live realtime',        desc: 'Supabase Realtime keeps order boards and KDS in sync across devices.' },
  { icon: Lock,             color: 'bg-gold-soft text-gold-dark',         title: 'Tenant isolation',     desc: 'Every query is scoped by restaurant — multi-tenant by design.' },
  { icon: BarChart3,        color: 'bg-success-soft text-success',      title: 'Analytics & bills',      desc: 'Table bills, receipts, and insights for owners who need the numbers.' },
  { icon: MonitorSmartphone, color: 'bg-primary-soft text-primary',     title: 'Staff & guest UX',      desc: 'Responsive layouts for tablets at the pass and phones in the dining room.' },
  { icon: Wallet,           color: 'bg-gold-soft text-gold-dark',         title: 'Payments ready',       desc: 'eSewa flows and payment return routes wired for Nepali checkout patterns.' },
  { icon: Cloud,            color: 'bg-success-soft text-success',      title: 'Cloud-native stack',   desc: 'Hosted API on Railway, Vite + React — fast deploys and reliable uptime.' },
];

const TRUSTED_BY = [
  'Himalayan Kitchen Group',
  'Thamel Heritage Bistro',
  'Pokhara Lakeside Inn',
  'Bhaktapur Durbar Café',
  'KTM Cloud Kitchen Co.',
  'Everest View Hotels',
  'Lalitpur Family Dine',
  'Chitwan Riverside Resort',
];

const TESTIMONIALS = [
  {
    quote: 'The staff gate finally stopped duplicate orders during rush hour. Our kitchen runs calmer.',
    name: 'Sunita M.',
    role: 'Restaurant owner, Kathmandu',
  },
  {
    quote: 'VAT fields and receipts match what our accountant expects — huge for IRD peace of mind.',
    name: 'Bikram T.',
    role: 'Operations, hotel chain',
  },
  {
    quote: 'Room QR for concierge requests replaced three different phone extensions. Guests love it.',
    name: 'Pema S.',
    role: 'Front office, Pokhara',
  },
];

const spring = { type: 'spring', damping: 27, stiffness: 340 };

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const marqueeItems = [...TRUSTED_BY, ...TRUSTED_BY];

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Nav */}
      <nav className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md shrink-0" />
          <div className="min-w-0">
            <span className="text-base font-black text-ink">Himbyte</span>
            <span className="hidden sm:inline text-xs text-muted ml-2">Nepal&apos;s Restaurant OS</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-2 justify-start sm:justify-end">
          <Link to="/contact" className="text-sm font-semibold text-body hover:text-primary transition-colors px-3 py-1.5">
            Contact
          </Link>
          <Link to="/pricing" className="text-sm font-semibold text-body hover:text-primary transition-colors px-3 py-1.5">
            Pricing
          </Link>
          <Link to="/register" className="text-sm font-semibold text-body hover:text-primary transition-colors px-3 py-1.5">
            List your venue
          </Link>
          <Link to={DEMO_MODE ? '/merchant' : '/login'} className="text-sm font-semibold text-body hover:text-primary transition-colors px-3 py-1.5">
            Staff Login
          </Link>
          <Link to="/admin" className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors shadow-sm">
            Admin
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <MandalaBackground opacity={0.05} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-7 border border-primary/20">
            <Mountain size={13} />
            Built for Nepal&apos;s Hospitality Industry · 2026
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink leading-[1.1] tracking-tight mb-6">
            The Smarter Way to Run<br />
            <span className="text-primary">Restaurants</span> &{' '}
            <span className="text-gold-dark">Hotels</span> in Nepal
          </h1>

          <p className="text-base sm:text-lg text-body max-w-xl mx-auto leading-relaxed mb-10">
            QR-based digital menus, staff-controlled order approvals, live kitchen display, and hotel concierge — all in one platform designed for the Nepali market.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/try-menu"
              className="inline-flex items-center gap-2.5 bg-primary text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors text-sm">
              <QrCode size={18} /> Try menu
            </Link>
            <Link to="/contact"
              className="inline-flex items-center gap-2.5 bg-surface text-ink font-bold px-7 py-3.5 rounded-2xl border border-border hover:border-primary/30 transition-colors text-sm">
              Contact us <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-ink mb-2">Built on modern tech</h2>
          <p className="text-sm text-muted max-w-2xl mx-auto">
            Everything you need to run service, stay compliant, and scale — from QR to realtime dashboards.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface rounded-2xl p-6 border border-border hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                <f.icon size={21} />
              </div>
              <h3 className="font-bold text-ink text-base mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Nepal compliance callout */}
        <div className="bg-primary rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5 text-white">
          <ShieldCheck size={36} className="flex-shrink-0 opacity-90" />
          <div className="flex-1">
            <h3 className="font-black text-base mb-1">IRD Compliant · Ready for Nepal&apos;s Digital Billing Rules</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Every restaurant tenant stores VAT/PAN details. Himbyte helps you meet Nepal&apos;s Inland Revenue Department (IRD) requirements out of the box — a key trust signal for restaurant owners.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {['VAT/PAN field on every account', 'Multi-tenant data isolation', 'Secure role-based access'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-white/80">
                <CheckCircle size={14} className="text-gold flex-shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trusted by — marquee */}
      <section className="py-12 border-y border-border bg-surface/80 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Trusted by teams across Nepal</p>
        </div>
        <div className="relative w-full overflow-hidden">
          <div
            className="flex w-max animate-marquee items-center gap-12 md:gap-16 pr-12"
            aria-hidden="true"
          >
            {marqueeItems.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="text-lg md:text-xl font-black text-ink/25 whitespace-nowrap select-none"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-ink mb-2">What operators say</h2>
          <p className="text-sm text-muted">Real workflows from venues piloting smarter service.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ ...spring, delay: i * 0.08 }}
            >
              <blockquote className="text-sm text-body leading-relaxed flex-1 mb-5">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="pt-4 border-t border-border">
                <span className="font-bold text-ink text-sm block">{t.name}</span>
                <span className="text-xs text-muted">{t.role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
