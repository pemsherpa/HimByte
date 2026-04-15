import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { formatNpr } from '../../lib/vat';
import toast from 'react-hot-toast';
import { supabase, DEMO_MODE } from '../../lib/supabase';

const PERIOD_OPTIONS = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

/** Local calendar bounds as ISO strings for API ?from=&to= */
function getReceiptQueryForPeriod(periodId) {
  if (periodId === 'all') return {};
  const now = new Date();
  const startOfLocalDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfLocalDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const startOfWeekMonday = (d) => {
    const x = new Date(d);
    const day = x.getDay();
    const daysSinceMon = (day + 6) % 7;
    x.setDate(x.getDate() - daysSinceMon);
    return startOfLocalDay(x);
  };
  if (periodId === 'day') {
    return {
      from: startOfLocalDay(now).toISOString(),
      to: endOfLocalDay(now).toISOString(),
    };
  }
  if (periodId === 'week') {
    return {
      from: startOfWeekMonday(now).toISOString(),
      to: endOfLocalDay(now).toISOString(),
    };
  }
  if (periodId === 'month') {
    const start = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { from: start.toISOString(), to: endOfLocalDay(now).toISOString() };
  }
  if (periodId === 'year') {
    const start = startOfLocalDay(new Date(now.getFullYear(), 0, 1));
    return { from: start.toISOString(), to: endOfLocalDay(now).toISOString() };
  }
  return {};
}

export default function MerchantReceipts() {
  const { restaurantId } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState('month');

  const queryOpts = useMemo(() => getReceiptQueryForPeriod(period), [period]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .listReceipts(restaurantId, queryOpts)
      .then(setRows)
      .catch(() => toast.error('Could not load receipts'))
      .finally(() => setLoading(false));
  }, [restaurantId, queryOpts]);

  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;
    let t;
    const debouncedReload = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        api.listReceipts(restaurantId, queryOpts).then(setRows).catch(() => {});
      }, 250);
    };
    const channel = supabase
      .channel(`receipts-sync:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'receipts', filter: `restaurant_id=eq.${restaurantId}` },
        debouncedReload,
      )
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryOpts]);

  const totalInRange = useMemo(
    () => rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
    [rows],
  );

  async function handleExport() {
    if (!restaurantId) return;
    setExporting(true);
    try {
      const blob = await api.exportReceiptsCsv(restaurantId, queryOpts);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `himbyte-receipts-${restaurantId.slice(0, 8)}-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (e) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (!restaurantId) {
    return (
      <div>
        <h1 className="text-2xl font-black text-ink">Receipts</h1>
        <p className="mt-3 text-sm text-muted">No restaurant linked to this login.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Receipts</h1>
          <p className="text-sm text-muted mt-0.5">
            Saved bills and payment records — filter by period and export for reporting.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || rows.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-45 transition-colors"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {PERIOD_OPTIONS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant={period === p.id ? 'gold' : 'ghost'}
            size="sm"
            className="rounded-2xl"
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {rows.length > 0 && (
        <Card className="p-4 mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">Total in range</p>
          <p className="text-xl font-black text-ink tabular-nums">{formatNpr(totalInRange)}</p>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <FileSpreadsheet size={36} className="mx-auto text-muted mb-3" />
          <p className="text-sm text-muted">
            {period === 'all'
              ? 'No receipts yet. Guests can tap "Save to records" on their digital bill after ordering.'
              : 'No receipts in this period. Try a wider range (e.g. All time) or pick another date range.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-muted uppercase tracking-wide">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-body mt-1">
                      Session <span className="font-mono text-xs">{r.session_id?.slice(0, 12) || '—'}…</span>
                      {r.guest_email && (
                        <span className="block text-xs text-muted mt-0.5">{r.guest_email}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-ink">{formatNpr(r.total_amount)}</p>
                    <p className="text-[11px] text-muted">
                      Subtotal {formatNpr(r.subtotal)}
                    </p>
                  </div>
                </div>
                {Array.isArray(r.line_items) && r.line_items.length > 0 && (
                  <ul className="mt-3 pt-3 border-t border-border text-xs text-body space-y-1">
                    {r.line_items.slice(0, 6).map((line, j) => (
                      <li key={j} className="flex justify-between gap-2">
                        <span className="truncate">{line.name}</span>
                        <span className="shrink-0 tabular-nums">
                          ×{line.quantity} · {formatNpr(line.line_total)}
                        </span>
                      </li>
                    ))}
                    {r.line_items.length > 6 && (
                      <li className="text-muted">+{r.line_items.length - 6} more lines…</li>
                    )}
                  </ul>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
