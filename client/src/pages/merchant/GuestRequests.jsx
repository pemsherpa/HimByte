import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const SERVICE_LABELS = {
  clean_room: 'Clean room',
  towels: 'Towels',
  dnd: 'Do not disturb',
  other: 'Front desk',
  call_waiter: 'Call waiter',
  need_menu: 'Need help',
  message: 'Guest message',
};

function labelFor(type) {
  return SERVICE_LABELS[type] || String(type || '').replace(/_/g, ' ');
}

export default function GuestRequests() {
  const { restaurantId } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await api.getServiceRequests(restaurantId);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || 'Could not load guest requests');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!restaurantId) return;
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [restaurantId, load]);

  async function setStatus(id, status) {
    try {
      const updated = await api.updateServiceRequestStatus(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      toast.success('Updated');
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  }

  if (!restaurantId) {
    return (
      <div>
        <h1 className="text-2xl font-black text-ink">Guest requests</h1>
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

  const open = rows.filter((r) => r.status === 'requested' || r.status === 'in_progress');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Guest requests</h1>
          <p className="text-sm text-muted mt-0.5">
            Hotel services, call waiter, and messages from QR guests — by room or table.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            load();
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-surface text-sm font-bold text-ink hover:bg-canvas-dark"
        >
          {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {open.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gold-dark bg-gold-soft border border-gold/25 rounded-2xl px-4 py-3">
          <Bell size={18} className="shrink-0" />
          {open.length} active request{open.length === 1 ? '' : 's'} need attention
        </div>
      )}

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <Bell size={36} className="mx-auto text-muted mb-3 opacity-40" />
          <p className="text-sm text-muted">No guest requests yet.</p>
          <p className="text-xs text-muted mt-2 max-w-md mx-auto">
            When a guest taps Clean room, Towels, Call waiter, or sends a message from their QR menu, it appears here
            with their room or table name.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="text-base font-bold text-ink mt-1">{labelFor(r.service_type)}</p>
                  <p className="text-sm text-primary font-semibold mt-0.5">
                    {r.tables_rooms?.identifier || (r.table_room_id ? 'Unknown location' : 'No table / room linked')}
                    {r.tables_rooms?.type === 'room' && (
                      <span className="text-xs font-normal text-muted ml-2">(room)</span>
                    )}
                  </p>
                  {r.notes && <p className="text-sm text-body mt-2 border-l-2 border-primary/30 pl-3">{r.notes}</p>}
                </div>
                <Badge status={r.status} />
              </div>
              {(r.status === 'requested' || r.status === 'in_progress') && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  {r.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, 'in_progress')}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-primary-soft text-primary hover:bg-primary/15"
                    >
                      In progress
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, 'completed')}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-success-soft text-success hover:bg-success/15"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, 'cancelled')}
                    className="text-xs font-bold px-3 py-2 rounded-xl text-muted hover:bg-canvas-dark"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
