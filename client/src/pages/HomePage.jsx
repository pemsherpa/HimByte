import { Link } from 'react-router-dom';
import { QrCode, ArrowRight, Mountain, Utensils, Hotel, CheckCircle, ShieldCheck, Zap } from 'lucide-react';
import MandalaBackground from '../components/patterns/MandalaBackground';
import { DEMO_MODE } from '../lib/supabase';

/** Demo menu paths: in-memory demo uses himalayan-kitchen; live Supabase uses seeded tenants. */
const MENU_TABLE = DEMO_MODE ? '/menu?r=himalayan-kitchen&table=1' : '/menu/hotel-tashi-delek?table=T1';
const MENU_ROOM  = DEMO_MODE ? '/menu?r=himalayan-kitchen&room=101' : '/menu/hotel-tashi-delek?table=R101';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <nav className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md" />
          <div>
            <span className="text-base font-black text-ink">Himbyte</span>
            <span className="hidden sm:inline text-xs text-muted ml-2">Nepal's Restaurant OS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-14 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-7 border border-primary/20">
            <Mountain size={13} />
            Built for Nepal's Hospitality Industry · 2026
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
            <Link to={MENU_TABLE}
              className="inline-flex items-center gap-2.5 bg-primary text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors text-sm">
              <QrCode size={18} /> Try the Demo Menu
            </Link>
            <Link to={DEMO_MODE ? '/merchant' : '/login'}
              className="inline-flex items-center gap-2.5 bg-surface text-ink font-bold px-7 py-3.5 rounded-2xl border border-border hover:border-primary/30 transition-colors text-sm">
              View Staff Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            { icon: QrCode,      color: 'bg-primary-soft text-primary',    title: 'QR Ordering',         desc: 'Guests scan, browse and order from their phone — no app downloads, no friction.' },
            { icon: Utensils,    color: 'bg-gold-soft text-gold-dark',     title: 'Staff Approval Gate', desc: 'Every order is verified by staff before reaching the kitchen. Full operational control.' },
            { icon: Hotel,       color: 'bg-success-soft text-success',    title: 'Hotel Concierge',     desc: 'Room service, towel requests, DND — all handled through the same QR interface.' },
          ].map((f) => (
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
            <h3 className="font-black text-base mb-1">IRD Compliant · Ready for Nepal's Digital Billing Rules</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Every restaurant tenant stores VAT/PAN details. Himbyte helps you meet Nepal's Inland Revenue Department (IRD) requirements out of the box — a key trust signal for restaurant owners.
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

      {/* Demo quick links */}
      <div className="bg-sidebar py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-5">Explore the Demo</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'Customer Menu',    to: MENU_TABLE,                                icon: Utensils },
              { label: 'Room Service',     to: MENU_ROOM,                                 icon: Hotel },
              { label: 'Merchant Orders',  to: '/merchant/orders',                        icon: Zap },
              { label: 'Kitchen Display',  to: '/merchant/kitchen',                       icon: CheckCircle },
              { label: 'Admin Dashboard',  to: '/admin',                                  icon: Mountain },
            ].map((l) => (
              <Link key={l.to} to={l.to}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors border border-white/10">
                <l.icon size={14} /> {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
