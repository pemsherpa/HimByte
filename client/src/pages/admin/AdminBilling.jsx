import { useEffect, useState } from 'react';
import { Loader2, PieChart, Receipt, DollarSign, CalendarClock } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function AdminBilling() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAdminBillingSummary()
      .then(setData)
      .catch((e) => toast.error(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center text-sm text-muted">No billing data.</Card>
    );
  }

  const entries = Object.entries(data.subscription_breakdown || {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Billing & plans</h1>
        <p className="text-sm text-muted mt-0.5">
          Subscription distribution and platform revenue signals. For statutory accounting, reconcile with your books and tax adviser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <PieChart size={14} /> Tenants
          </div>
          <p className="text-2xl font-black text-ink">{data.restaurant_count}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <CalendarClock size={14} /> Trials ending (7d)
          </div>
          <p className="text-2xl font-black text-ink">{data.trials_ending_next_7_days}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <Receipt size={14} /> Receipt lines
          </div>
          <p className="text-2xl font-black text-ink">{data.receipt_line_count ?? '—'}</p>
          <p className="text-xs text-muted mt-1">
            Rs. {Number(data.receipt_total_amount || 0).toLocaleString()} stored on receipts
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <DollarSign size={14} /> Order revenue (ex. cancelled)
          </div>
          <p className="text-2xl font-black text-ink">
            Rs. {Number(data.platform_order_revenue_ex_cancelled || 0).toLocaleString()}
          </p>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h2 className="text-sm font-black text-ink mb-3">Subscriptions by status</h2>
        <div className="flex flex-wrap gap-2">
          {entries.length === 0 ? (
            <span className="text-sm text-muted">—</span>
          ) : (
            entries.map(([k, v]) => (
              <span
                key={k}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-canvas-dark text-body capitalize"
              >
                {k}: {v}
              </span>
            ))
          )}
        </div>
      </Card>

      <p className="text-xs text-muted leading-relaxed max-w-3xl">{data.note}</p>
    </div>
  );
}
