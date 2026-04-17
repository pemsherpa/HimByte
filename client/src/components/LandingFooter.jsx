import { Link } from 'react-router-dom';
import { Mail, MessageCircle } from 'lucide-react';

const CONTACT_EMAILS = ['ptssherpa5@gmail.com', 'thapakashchitbikram@gmail.com'];
const WHATSAPP = [
  { label: 'India', href: 'https://wa.me/919632918555', display: '+91 96329 18555' },
  { label: 'Nepal', href: 'https://wa.me/9779841753666', display: '+977 9841753666' },
];

export default function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-sidebar text-white/90 border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 gap-y-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/assets/himbyte-logo.png" alt="" className="w-10 h-10 rounded-xl object-cover" />
              <span className="text-lg font-black text-white">Himbyte</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Nepal&apos;s restaurant operating system — QR ordering, staff approvals, and hotel concierge in one platform.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gold mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/pricing" className="text-white/70 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/register" className="text-white/70 hover:text-white transition-colors">List your venue</Link></li>
              <li><Link to="/contact" className="text-white/70 hover:text-white transition-colors">Contact us</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gold mb-3">Legal</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="text-white/70 hover:text-white transition-colors">Privacy policy</Link></li>
              <li><Link to="/terms" className="text-white/70 hover:text-white transition-colors">Terms of service</Link></li>
              <li><Link to="/cookies" className="text-white/70 hover:text-white transition-colors">Cookie policy</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gold mb-3">Reach us</p>
            <ul className="space-y-2 text-sm">
              {CONTACT_EMAILS.map((e) => (
                <li key={e}>
                  <a href={`mailto:${e}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <Mail size={14} className="text-gold flex-shrink-0" />
                    {e}
                  </a>
                </li>
              ))}
              {WHATSAPP.map((w) => (
                <li key={w.href}>
                  <a href={w.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <MessageCircle size={14} className="text-gold flex-shrink-0" />
                    <span className="text-white/50 text-xs mr-1">{w.label}</span>
                    {w.display}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/50">
          <p>© {year} Himbyte. All rights reserved.</p>
          <p className="max-w-xl">
            Operated in Nepal under applicable laws including the Electronic Transactions Act, 2063 (2006) and the Privacy Act, 2075 (2018). Legal pages are informational; consult a qualified lawyer for advice specific to your business.
          </p>
        </div>
      </div>
    </footer>
  );
}
