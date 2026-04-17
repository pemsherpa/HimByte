import { Link } from 'react-router-dom';
import { Mail, MessageCircle, MapPin, Clock } from 'lucide-react';
import MandalaBackground from '../components/patterns/MandalaBackground';
import LandingFooter from '../components/LandingFooter';

const EMAILS = [
  { label: 'General', addr: 'ptssherpa5@gmail.com' },
  { label: 'Partnerships', addr: 'thapakashchitbikram@gmail.com' },
];

const WHATSAPP = [
  { label: 'India', href: 'https://wa.me/919632918555', display: '+91 96329 18555' },
  { label: 'Nepal', href: 'https://wa.me/9779841753666', display: '+977 9841753666' },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between w-full">
        <Link to="/" className="flex items-center gap-3">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md" />
          <div>
            <span className="text-base font-black text-ink">Himbyte</span>
            <span className="hidden sm:inline text-xs text-muted ml-2">Contact</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/pricing" className="text-sm font-semibold text-body hover:text-primary transition-colors px-3 py-1.5">
            Pricing
          </Link>
          <Link to="/register" className="text-sm font-semibold text-body hover:text-primary transition-colors px-3 py-1.5">
            List your venue
          </Link>
          <Link to="/" className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors shadow-sm">
            Home
          </Link>
        </div>
      </nav>

      <div className="relative flex-1 overflow-hidden">
        <MandalaBackground opacity={0.05} />
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-3xl sm:text-4xl font-black text-ink mb-4">Contact us</h1>
            <p className="text-body leading-relaxed">
              Whether you run a café in Kathmandu, a hotel in Pokhara, or a chain across Nepal — we&apos;d love to hear from you.
              Reach out for demos, pricing, or technical questions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-2 text-gold-dark mb-4">
                <Mail size={22} />
                <h2 className="text-lg font-black text-ink">Email</h2>
              </div>
              <ul className="space-y-4">
                {EMAILS.map((e) => (
                  <li key={e.addr}>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">{e.label}</p>
                    <a
                      href={`mailto:${e.addr}`}
                      className="text-primary font-semibold text-base hover:underline break-all"
                    >
                      {e.addr}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-2 text-gold-dark mb-4">
                <MessageCircle size={22} />
                <h2 className="text-lg font-black text-ink">WhatsApp</h2>
              </div>
              <ul className="space-y-4">
                {WHATSAPP.map((w) => (
                  <li key={w.href}>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">{w.label}</p>
                    <a
                      href={w.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary font-semibold text-base hover:underline"
                    >
                      {w.display}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-8 bg-primary-soft rounded-2xl border border-primary/20 p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start">
            <MapPin className="text-primary flex-shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="font-bold text-ink mb-2">Serving Nepal&apos;s hospitality sector</h3>
              <p className="text-sm text-body leading-relaxed">
                Himbyte is built for Nepali VAT/PAN workflows, multi-outlet operations, and the realities of peak dining hours.
                We respond to enquiries in English and Nepali during business hours.
              </p>
            </div>
            <div className="sm:ml-auto flex items-start gap-2 text-sm text-muted">
              <Clock size={18} className="text-primary flex-shrink-0 mt-0.5" />
              <span>Typical reply: within 1–2 business days</span>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
