import { Link } from 'react-router-dom';
import { Check, Mountain } from 'lucide-react';
import MandalaBackground from '../components/patterns/MandalaBackground';
import { DEMO_MODE } from '../lib/supabase';

const PLANS = [
  {
    name: 'Starter',
    price: '2,999',
    period: '/ month',
    desc: 'Single venue, QR menus, staff gate, kitchen screen.',
    features: ['Up to 2 tablets', 'Email support', 'Standard reports'],
    cta: 'Start trial',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '5,999',
    period: '/ month',
    desc: 'Hotels & busy restaurants — table bills, analytics, concierge.',
    features: ['Table & room QR', 'VAT receipt export', 'Priority support'],
    cta: 'Talk to sales',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Multi-branch chains, custom integrations, SLA.',
    features: ['Dedicated success', 'SSO & audit', 'Custom SLA'],
    cta: 'Contact us',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <nav className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md" />
          <span className="text-base font-black text-ink">Himbyte</span>
        </Link>
        <Link
          to="/register"
          className="text-sm font-bold text-primary hover:underline"
        >
          List your venue
        </Link>
      </nav>

      <div className="relative overflow-hidden">
        <MandalaBackground opacity={0.05} />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-8 pb-20">
          <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-primary/20">
            <Mountain size={13} />
            Transparent Nepal pricing · NPR
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink mb-3">Plans that scale with your venue</h1>
          <p className="text-body max-w-2xl leading-relaxed mb-12">
            Every plan includes QR ordering, the staff approval gate, and VAT-aware receipts. Card billing is processed
            securely when you connect Stripe — until then, your team runs on a trial managed from Himbyte HQ.
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
                  <span className="text-3xl font-black text-ink">Rs. {p.price}</span>
                  <span className="text-sm text-muted">{p.period}</span>
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
            Shown prices are indicative for planning. Final billing, tax invoices, and Nepal VAT treatment are confirmed
            at checkout or in your Himbyte agreement. Stripe Connect may apply card processing fees.
          </p>
        </div>
      </div>
    </div>
  );
}
