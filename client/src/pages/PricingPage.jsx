import { Link } from 'react-router-dom';
import { Check, Mountain, ShieldCheck } from 'lucide-react';
import MandalaBackground from '../components/patterns/MandalaBackground';
import LandingFooter from '../components/LandingFooter';
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
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md" />
          <span className="text-base font-black text-ink">Himbyte</span>
        </Link>
        <div className="flex items-center gap-4">
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

          <section className="mt-16 pt-16 border-t border-border">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={26} strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
                  POS, IRD &amp; statutory compliance (Nepal)
                </h2>
                <p className="text-sm text-muted mt-1 max-w-2xl">
                  What vendors often mean when they ask about POS rules and Inland Revenue Office (IRD) registration.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-5 text-sm text-body leading-relaxed">
              <p>
                In Nepal, <strong className="text-ink">&quot;POS&quot;</strong> in a tax conversation usually means your{' '}
                <strong className="text-ink">sales and billing system</strong> that can issue{' '}
                <strong className="text-ink">VAT-legal tax invoices</strong>: correct invoice serials, VAT lines, seller/buyer PAN
                where required, dates, and item detail — plus an audit trail IRD can rely on. Large or listed taxpayers may also need{' '}
                <strong className="text-ink">IRD-registered / approved electronic billing software</strong> and to follow current{' '}
                electronic billing and reporting rules (check the IRD taxpayer portal and notices — requirements change).
              </p>
              <p>
                <strong className="text-ink">VAT registration</strong> depends on turnover and sector rules. Whether you must use only
                IRD-listed billing products is also <strong className="text-ink">specific to your case</strong>. Confirm both with a Nepal
                chartered accountant and IRD guidance for your financial year.
              </p>
              <p>
                <strong className="text-ink">Hisab kitab</strong> (accounts / proper books) means statutory{' '}
                <strong className="text-ink">books of account</strong> — not just order tickets. Restaurants typically pair{' '}
                <strong className="text-ink">billing / POS software</strong> that meets IRD expectations with{' '}
                <strong className="text-ink">accounting software</strong> (general ledger, purchases, VAT return support). Products in
                market include various <strong className="text-ink">IRD-listed</strong> suites; your CA can shortlist what fits your entity.
              </p>
              <div className="rounded-xl bg-primary-soft/80 border border-primary/15 px-4 py-3 text-sm">
                <p className="font-bold text-ink mb-1">Where Himbyte fits</p>
                <p className="text-body">
                  Himbyte is a <strong className="text-ink">venue operating system</strong> — QR menus, staff approval, tables, and
                  workflows — with <strong className="text-ink">VAT/PAN fields</strong> on the tenant for your records. It does{' '}
                  <strong className="text-ink">not</strong> replace a certified IRD e-billing POS or full statutory accounting stack by
                  itself. For full compliance, plan integrations or parallel use with <strong className="text-ink">IRD-approved billing</strong>{' '}
                  and <strong className="text-ink">proper accounting software</strong> as your adviser recommends.
                </p>
              </div>
              <p className="text-xs text-muted border-t border-border pt-5">
                This section is for general orientation only and is not legal or tax advice. Use the IRD taxpayer portal, official
                circulars, and a qualified professional in Nepal for decisions that affect registration, invoices, and returns.
              </p>
            </div>
          </section>

          <p className="text-xs text-muted text-center mt-12 max-w-xl mx-auto leading-relaxed">
            Shown prices are indicative for planning. Final billing, tax invoices, and Nepal VAT treatment are confirmed
            at checkout or in your Himbyte agreement. Stripe Connect may apply card processing fees.
          </p>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
