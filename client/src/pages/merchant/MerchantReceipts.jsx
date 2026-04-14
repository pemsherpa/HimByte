import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import { formatNpr } from '../../lib/vat';
import toast from 'react-hot-toast';
import { supabase, DEMO_MODE } from '../../lib/supabase';

export default function MerchantReceipts() {
  const { restaurantId } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .listReceipts(restaurantId)
      .then(setRows)
      .catch(() => toast.error('Could not load receipts'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;
    let t;
    const debouncedReload = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        api.listReceipts(restaurantId).then(setRows).catch(() => {});
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
  }, [restaurantId]);

  async function handleExport() {
    if (!restaurantId) return;
    setExporting(true);
    try {
      const blob = await api.exportReceiptsCsv(restaurantId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `himbyte-receipts-${restaurantId.slice(0, 8)}.csv`;
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
            Saved bills and payment records — export for reporting.
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

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <FileSpreadsheet size={36} className="mx-auto text-muted mb-3" />
          <p className="text-sm text-muted">
            No receipts yet. Guests can tap &quot;Save to records&quot; on their digital bill after ordering.
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
