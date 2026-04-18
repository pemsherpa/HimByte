import { Link } from 'react-router-dom';
import { Check, Mountain } from 'lucide-react';
import MandalaBackground from '../components/patterns/MandalaBackground';
import LandingFooter from '../components/LandingFooter';
import { DEMO_MODE } from '../lib/supabase';

const PLANS = [
  {
    name: 'Starter',
    priceLine: 'To be disclosed soon',
    desc: 'Single venue, QR menus, staff gate, kitchen screen.',
    features: ['Up to 2 tablets', 'Email support', 'Standard reports'],
    cta: 'Start trial',
    highlight: false,
  },
  {
    name: 'Growth',
    priceLine: 'To be disclosed soon',
    desc: 'Hotels & busy restaurants — table bills, analytics, concierge.',
    features: ['Table & room QR', 'Receipt export', 'Priority support'],
    cta: 'Talk to sales',
    highlight: true,
  },
  {
    name: 'Enterprise',
    priceLine: 'Coming soon — let’s talk',
    desc: 'Multi-branch chains, custom integrations, SLA.',
    features: ['Dedicated success', 'SSO & audit', 'Custom SLA'],
    cta: 'Contact us',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-3 min-w-0 shrink-0">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md shrink-0" />
          <span className="text-base font-black text-ink truncate">Himbyte</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/contact" className="text-sm font-semibold text-body hover:text-primary transition-colors">
            Contact
          </Link>
          <Link
            to="/register"
            className="text-sm font-bold text-primary hover:underline"
          >
            List your venue
          </Link>
        </div>
      </nav>

      <div className="relative overflow-hidden flex-1">
        <MandalaBackground opacity={0.05} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-20">
          <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-primary/20">
            <Mountain size={13} />
            Plans for Nepal venues
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink mb-3">Plans that scale with your venue</h1>
          <p className="text-body max-w-2xl leading-relaxed mb-12">
            Every plan includes QR ordering and the staff approval gate. Official pricing will be published here soon;
            until then, contact us for early access — your team can run on a trial managed from Himbyte HQ.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 flex flex-col bg-surface shadow-sm
                  ${p.highlight ? 'border-gold ring-2 ring-gold/30 shadow-md' : 'border-border'}`}
              >
                {p.highlight && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold-dark mb-2">
                    Most popular
                  </span>
                )}
                <h2 className="text-lg font-black text-ink">{p.name}</h2>
                <p className="text-sm text-muted mt-1 flex-1">{p.desc}</p>
                <div className="mt-5 mb-4">
                  <span className="text-lg sm:text-xl font-bold text-primary">{p.priceLine}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-body">
                      <Check size={16} className="text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={DEMO_MODE ? '/register' : '/login'}
                  className={`mt-auto text-center font-bold py-3 rounded-2xl text-sm transition-colors
                    ${p.highlight ? 'bg-gold text-ink hover:bg-gold-light' : 'bg-primary text-white hover:bg-primary-dark'}`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted text-center mt-12 max-w-xl mx-auto leading-relaxed">
            Pricing will be announced here soon. Final rates and billing details will be confirmed in your Himbyte agreement
            before you subscribe.
          </p>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
