import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, Loader2, Users, LayoutGrid, ClipboardList, DollarSign, Receipt, Mail, Hash, MapPin,
} from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function AdminRestaurantDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getAdminRestaurantDetail(id)
      .then(setData)
      .catch((e) => toast.error(e.message || 'Failed to load tenant'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!data?.restaurant) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted">Tenant not found.</p>
        <Link to="/admin/restaurants" className="text-primary text-sm font-semibold mt-3 inline-block">
          Back to restaurants
        </Link>
      </Card>
    );
  }

  const r = data.restaurant;

  return (
    <div>
      <Link
        to="/admin/restaurants"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark mb-4"
      >
        <ArrowLeft size={16} /> Restaurants
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <Building2 className="text-primary" size={26} />
            {r.name}
          </h1>
          <p className="text-sm text-muted mt-0.5">/{r.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge status={r.is_active ? 'active' : 'cancelled'} />
          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-lg bg-primary-soft text-primary">
            {r.subscription_status || 'trial'}
          </span>
          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-lg bg-gold-soft text-gold-dark">
            {r.subscription_plan || 'starter'}
          </span>
        </div>
      </div>

      {r.trial_ends_at && (
        <p className="text-xs text-muted mb-4">Trial ends: {new Date(r.trial_ends_at).toLocaleString()}</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <ClipboardList size={14} /> Orders
          </div>
          <p className="text-2xl font-black text-ink">{data.total_orders}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <DollarSign size={14} /> Order revenue
          </div>
          <p className="text-2xl font-black text-ink">Rs. {Number(data.order_revenue).toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <LayoutGrid size={14} /> Tables & rooms
          </div>
          <p className="text-2xl font-black text-ink">{data.table_count}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase mb-2">
            <Users size={14} /> Staff
          </div>
          <p className="text-2xl font-black text-ink">{data.staff_count}</p>
        </Card>
      </div>

      {data.receipt_count != null && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 text-sm font-bold text-ink mb-1">
            <Receipt size={16} className="text-primary" /> VAT receipts (stored)
          </div>
          <p className="text-sm text-body">
            {data.receipt_count} receipts · Rs. {Number(data.receipt_total || 0).toLocaleString()} total
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="text-sm font-black text-ink mb-3">Owner & compliance</h2>
          {data.owner ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-ink">{data.owner.full_name || '—'}</p>
              {data.owner.email && (
                <p className="flex items-center gap-2 text-muted">
                  <Mail size={14} /> <span className="font-mono text-xs">{data.owner.email}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">No restaurant_admin linked yet.</p>
          )}
          {r.vat_pan_number && (
            <p className="flex items-center gap-2 text-xs text-muted mt-3">
              <Hash size={12} /> VAT/PAN: {r.vat_pan_number}
            </p>
          )}
          {r.address && (
            <p className="flex items-start gap-2 text-xs text-muted mt-2">
              <MapPin size={12} className="mt-0.5 flex-shrink-0" /> {r.address}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-black text-ink mb-3">Team ({(data.profiles || []).length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(data.profiles || []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 last:border-0"
              >
                <span className="text-sm text-body truncate">{p.full_name || '—'}</span>
                <span className="text-[10px] font-bold uppercase text-muted shrink-0">{p.role?.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
