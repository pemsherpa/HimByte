import { useEffect, useState } from 'react';
import { Building2, MapPin, Hash, Loader2, Settings2 } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['trial', 'active', 'past_due', 'cancelled'];

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ subscription_status: 'trial', subscription_plan: 'starter', trial_ends_at: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .getAllRestaurants()
      .then(setRestaurants)
      .catch(() => toast.error('Failed to load restaurants'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function toLocalDatetimeValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEdit(r) {
    setEditing(r);
    const ends = toLocalDatetimeValue(r.trial_ends_at);
    setForm({
      subscription_status: r.subscription_status || 'trial',
      subscription_plan: r.subscription_plan || 'starter',
      trial_ends_at: ends,
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        subscription_status: form.subscription_status,
        subscription_plan: form.subscription_plan,
        trial_ends_at: form.trial_ends_at ? new Date(form.trial_ends_at).toISOString() : null,
      };
      const updated = await api.updateRestaurantSubscription(editing.id, body);
      setRestaurants((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      toast.success('Subscription updated');
      setEditing(null);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Restaurants</h1>
          <p className="text-sm text-muted mt-0.5">All registered tenants — subscription and trial controls.</p>
        </div>
      </div>

      {restaurants.length === 0 ? (
        <Card className="p-10 text-center">
          <Building2 size={36} className="mx-auto text-muted mb-3" />
          <p className="text-sm text-muted">No restaurants registered yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((r) => (
            <div key={r.id}>
              <Card className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-sm truncate">{r.name}</h3>
                    <p className="text-xs text-muted">/{r.slug}</p>
                  </div>
                  <Badge status={r.is_active ? 'active' : 'cancelled'} />
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-gold-soft text-gold-dark">
                    {r.venue_type === 'hotel' ? 'Hotel' : 'Restaurant'}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-primary-soft text-primary">
                    {r.subscription_status || 'trial'}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-canvas-dark text-body">
                    {r.subscription_plan || 'starter'}
                  </span>
                </div>
                {r.trial_ends_at && (
                  <p className="text-[11px] text-muted mb-2">
                    Trial ends: {new Date(r.trial_ends_at).toLocaleString()}
                  </p>
                )}

                {r.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                    <MapPin size={12} /> {r.address}
                  </div>
                )}
                {r.vat_pan_number && (
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
                    <Hash size={12} /> VAT/PAN: {r.vat_pan_number}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                  <span className="text-xs text-muted">Orders today</span>
                  <span className="text-sm font-bold text-ink">{r.order_count_today ?? 0}</span>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-xs font-bold text-ink hover:bg-canvas-dark transition-colors"
                >
                  <Settings2 size={14} className="text-primary" />
                  Subscription
                </button>

                {r.profiles?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Team</p>
                    <div className="space-y-1">
                      {r.profiles.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-body truncate">{p.full_name || 'Unnamed'}</span>
                            <Badge
                              status={p.role === 'restaurant_admin' ? 'active' : 'pending'}
                              className="text-[9px] !px-1.5"
                            />
                          </div>
                          {p.email && (
                            <span className="text-[10px] text-muted truncate font-mono">{p.email}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog">
          <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-black text-ink mb-1">Subscription</h2>
            <p className="text-xs text-muted mb-4">{editing.name}</p>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Status</label>
                <select
                  value={form.subscription_status}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_status: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Plan</label>
                <input
                  value={form.subscription_plan}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_plan: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm"
                  placeholder="starter, growth, enterprise"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Trial ends (local)</label>
                <input
                  type="datetime-local"
                  value={form.trial_ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, trial_ends_at: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm"
                />
                <p className="text-[10px] text-muted mt-1">Clear by saving with empty field — use status &quot;active&quot; for paid venues.</p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-muted hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
