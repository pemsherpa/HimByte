import { Link } from 'react-router-dom';
import MandalaBackground from './patterns/MandalaBackground';
import LandingFooter from './LandingFooter';

export default function LegalPageShell({ title, children }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-md shrink-0" />
          <span className="text-base font-black text-ink truncate">Himbyte</span>
        </Link>
        <Link to="/contact" className="text-sm font-semibold text-primary hover:underline shrink-0">
          Contact
        </Link>
      </nav>

      <div className="relative flex-1 overflow-hidden min-w-0">
        <MandalaBackground opacity={0.05} />
        <article className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16 break-words">
          <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Legal</p>
          <h1 className="text-3xl font-black text-ink mb-8">{title}</h1>
          <div className="text-sm text-body leading-relaxed [&>*:not(h2)]:mt-0 [&_h2]:text-ink [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:text-ink [&_h3]:font-semibold [&_h3]:mt-6 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-ink">
            {children}
          </div>
        </article>
      </div>

      <LandingFooter />
    </div>
  );
}
