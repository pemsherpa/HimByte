import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Check, Loader2, XCircle, Phone, MapPin, Receipt, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function AdminVenueRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  function load() {
    setLoading(true);
    api
      .getVenueRegistrations('pending')
      .then(setItems)
      .catch((e) => toast.error(e.message || 'Could not load requests'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    if (!window.confirm('Approve this venue and create their account? They can sign in immediately.')) return;
    setActing(id);
    try {
      await api.approveVenueRegistration(id);
      toast.success('Venue approved — owner can sign in.');
      load();
    } catch (e) {
      toast.error(e.message || 'Approve failed');
    } finally {
      setActing(null);
    }
  }

  async function reject(id) {
    if (!window.confirm('Reject this application? They will receive an email.')) return;
    setActing(id);
    try {
      await api.rejectVenueRegistration(id);
      toast.success('Rejected and applicant was emailed.');
      load();
    } catch (e) {
      toast.error(e.message || 'Reject failed');
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Venue applications</h1>
        <p className="text-sm text-muted mt-0.5">
          Review &quot;List your venue&quot; signups. Approve only when you are ready to provision their tenant.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted text-sm">No pending applications.</Card>
      ) : (
        <div className="space-y-4">
          {items.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 size={18} className="text-primary shrink-0" />
                      <h2 className="font-black text-ink text-lg truncate">{row.restaurant_name}</h2>
                      <Badge status="pending" />
                    </div>
                    <p className="text-sm text-body mt-2">
                      <span className="font-semibold text-ink">{row.owner_name}</span>
                      <span className="text-muted"> · </span>
                      <a href={`mailto:${row.email}`} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                        <Mail size={14} className="opacity-70" />
                        {row.email}
                      </a>
                    </p>
                    <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {row.phone && (
                        <div className="flex items-start gap-2">
                          <Phone size={15} className="text-muted shrink-0 mt-0.5" />
                          <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Phone</dt>
                            <dd className="text-ink font-medium">
                              <a href={`tel:${row.phone}`} className="hover:underline">{row.phone}</a>
                            </dd>
                          </div>
                        </div>
                      )}
                      {row.address && (
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <MapPin size={15} className="text-muted shrink-0 mt-0.5" />
                          <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Address</dt>
                            <dd className="text-body whitespace-pre-wrap">{row.address}</dd>
                          </div>
                        </div>
                      )}
                      {row.vat_pan_number && (
                        <div className="flex items-start gap-2">
                          <Receipt size={15} className="text-muted shrink-0 mt-0.5" />
                          <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">VAT / PAN</dt>
                            <dd className="text-ink font-mono text-sm">{row.vat_pan_number}</dd>
                          </div>
                        </div>
                      )}
                    </dl>
                    <p className="text-xs text-muted mt-3 pt-3 border-t border-border/80">
                      Slug <span className="font-mono text-body">{row.slug}</span> ·{' '}
                      {row.venue_type === 'hotel' ? 'Hotel / lodge' : 'Restaurant'} ·{' '}
                      Submitted {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={acting === row.id}
                      onClick={() => approve(row.id)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success text-white text-sm font-bold hover:opacity-95 disabled:opacity-50"
                    >
                      {acting === row.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={acting === row.id}
                      onClick={() => reject(row.id)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-bold text-danger hover:bg-danger-soft disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
