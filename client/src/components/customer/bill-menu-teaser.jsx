import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { useMemo } from 'react';

/**
 * Compact strip on the menu linking to the full bill page (same query params).
 */
export default function BillMenuTeaser({ searchString }) {
  const to = useMemo(() => `/bill${searchString ? `?${searchString}` : ''}`, [searchString]);

  return (
    <div className="px-4 pb-3">
      <Link
        to={to}
        className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-surface border border-border shadow-sm hover:border-primary/35 hover:bg-primary-soft/20 transition-colors active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Receipt className="text-primary" size={20} />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Your bill</p>
            <p className="text-sm font-bold text-ink truncate">View full bill &amp; VAT</p>
            <p className="text-[11px] text-muted">Only includes orders approved by staff</p>
          </div>
        </div>
        <span className="text-xs font-bold text-primary shrink-0">Open</span>
      </Link>
    </div>
  );
}
