import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus, Truck } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

function isOverdue(dueDateStr, status) {
  if (status !== 'open') return false;
  const d = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export default function VendorDueReport() {
  const { restaurantId } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    vendor_name: '',
    description: '',
    amount_due: '',
    due_date: '',
    vendor_id: '',
  });

  function load() {
    if (!restaurantId) return;
    Promise.all([api.listVendorPayables(restaurantId), api.listVendors(restaurantId)])
      .then(([payables, v]) => {
        setRows(payables || []);
        setVendors(v || []);
      })
      .catch(() => toast.error('Could not load vendor dues'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [restaurantId]);

  const openTotal = useMemo(
    () =>
      rows.filter((r) => r.status === 'open').reduce((s, r) => s + Number(r.amount_due || 0), 0),
    [rows],
  );

  const overdueRows = useMemo(() => rows.filter((r) => isOverdue(r.due_date, r.status)), [rows]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!restaurantId) return;
    try {
      await api.createVendorPayable(restaurantId, {
        vendor_name: form.vendor_name,
        description: form.description || null,
        amount_due: Number(form.amount_due),
        due_date: form.due_date,
        vendor_id: form.vendor_id || null,
      });
      toast.success('Payable added');
      setShowForm(false);
      setForm({ vendor_name: '', description: '', amount_due: '', due_date: '', vendor_id: '' });
      load();
    } catch {
      toast.error('Failed to add');
    }
  }

  async function markPaid(id) {
    if (!restaurantId) return;
    try {
      await api.updateVendorPayable(restaurantId, id, { status: 'paid' });
      toast.success('Marked paid');
      load();
    } catch {
      toast.error('Update failed');
    }
  }

  if (!restaurantId) {
    return <p className="text-sm text-muted">No restaurant linked.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-soft flex items-center justify-center">
            <Truck className="text-primary" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">Vendor due report</h1>
            <p className="text-sm text-muted">Accounts payable by due date</p>
          </div>
        </div>
        <Button variant="gold" className="rounded-2xl" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Add payable
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">Open balance</p>
          <p className="text-2xl font-black text-ink mt-1">Rs. {openTotal.toLocaleString()}</p>
        </Card>
        <Card className="p-5 border-warning/40 bg-warning-soft/40">
          <p className="text-xs font-bold text-warning uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle size={14} /> Overdue lines
          </p>
          <p className="text-2xl font-black text-ink mt-1">{overdueRows.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">All rows</p>
          <p className="text-2xl font-black text-primary mt-1">{rows.length}</p>
        </Card>
      </div>

      {showForm && (
        <motion.form
          layout
          onSubmit={handleAdd}
          className="bg-surface rounded-2xl border border-border p-5 mb-6 space-y-3"
        >
          <p className="font-bold text-ink text-sm">New payable</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-muted">
              Vendor name
              <input
                required
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                value={form.vendor_name}
                onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Link vendor (optional)
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                value={form.vendor_id}
                onChange={(e) => setForm((f) => ({ ...f, vendor_id: e.target.value }))}
              >
                <option value="">—</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted sm:col-span-2">
              Description
              <input
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Amount (Rs.)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                value={form.amount_due}
                onChange={(e) => setForm((f) => ({ ...f, amount_due: e.target.value }))}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Due date
              <input
                required
                type="date"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" className="rounded-2xl">
              Save
            </Button>
            <Button type="button" variant="ghost" className="rounded-2xl" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-canvas">
          <h2 className="font-bold text-ink text-sm">Payables</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-muted border-b border-border">
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No payables yet
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/80 hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{r.vendor_name}</p>
                      {r.description && <p className="text-xs text-muted">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.due_date}
                      {isOverdue(r.due_date, r.status) && (
                        <span className="ml-2 text-[10px] font-bold text-danger uppercase">Overdue</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      Rs. {Number(r.amount_due).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.status}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'open' && (
                        <Button
                          variant="success"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => markPaid(r.id)}
                        >
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
