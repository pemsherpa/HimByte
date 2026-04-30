import { useEffect, useState } from 'react';
import { Loader2, Filter, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'approved', 'preparing', 'ready', 'served', 'cancelled'];

function statusPillClass(status) {
  if (status === 'served') return 'bg-success-soft text-success';
  if (status === 'pending') return 'bg-warning-soft text-warning';
  if (status === 'cancelled') return 'bg-danger-soft text-danger';
  return 'bg-primary-soft text-primary';
}

export default function AdminOrdersControl() {
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(null);

  function load() {
    setLoading(true);
    api
      .getAdminPlatformOrders({
        restaurant_id: restaurantId || undefined,
        status: status || undefined,
        limit: 100,
      })
      .then(setOrders)
      .catch((e) => toast.error(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.getAllRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [restaurantId, status]);

  async function patchStatus(orderId, next) {
    setBusy(orderId);
    try {
      await api.updateOrderStatus(orderId, next);
      toast.success(`Order → ${next}`);
      load();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Order control</h1>
        <p className="text-sm text-muted mt-0.5">
          Cross-venue orders (super admin). Use carefully: changes apply immediately to the guest and staff apps.
        </p>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-muted">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase">Filters</span>
        </div>
        <select
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          className="text-sm px-3 py-2 rounded-xl border border-border bg-surface min-w-[200px]"
        >
          <option value="">All restaurants</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm px-3 py-2 rounded-xl border border-border bg-surface"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          className="text-sm font-bold px-4 py-2 rounded-xl bg-canvas-dark text-ink hover:bg-border/80"
        >
          Refresh
        </button>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm text-left">
            <thead className="bg-canvas text-[10px] uppercase font-bold text-muted border-b border-border">
              <tr>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border/70 hover:bg-canvas-dark/60">
                  <td className="px-4 py-3 font-semibold text-ink">{o.restaurants?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{o.tables_rooms?.identifier || '—'}</td>
                  <td className="px-4 py-3">{o.display_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${statusPillClass(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">Rs. {Number(o.total_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {o.status !== 'served' && o.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={busy === o.id}
                          onClick={() => patchStatus(o.id, 'served')}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-success-soft text-success hover:opacity-90 disabled:opacity-40"
                        >
                          <CheckCircle size={12} /> Complete
                        </button>
                      )}
                      {o.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={busy === o.id}
                          onClick={() => {
                            if (!window.confirm('Cancel this order? Guest and staff will see it as cancelled.')) return;
                            patchStatus(o.id, 'cancelled');
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-danger-soft text-danger hover:opacity-90 disabled:opacity-40"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="text-center text-sm text-muted py-12">No orders match filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
