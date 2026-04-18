import { useEffect, useState } from 'react';
import { Loader2, Trophy, TrendingDown, LayoutGrid, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

function RankTable({ title, icon: Icon, rows, valueKey, extraLabel }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Icon size={18} className="text-primary" />
        <h2 className="font-bold text-ink text-sm">{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {(rows || []).slice(0, 10).map((r, i) => (
          <div key={r.restaurant_id} className="px-5 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-black text-gold w-5">{i + 1}</span>
              <Link
                to={`/admin/restaurants/${r.restaurant_id}`}
                className="font-semibold text-ink text-sm truncate hover:text-primary"
              >
                {r.name}
              </Link>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-ink">
                {valueKey === 'revenue' ? `Rs. ${Number(r[valueKey]).toLocaleString()}` : r[valueKey]}
              </p>
              {extraLabel && (
                <p className="text-[10px] text-muted">
                  {extraLabel(r)}
                </p>
              )}
            </div>
          </div>
        ))}
        {(!rows || rows.length === 0) && (
          <p className="px-5 py-8 text-center text-sm text-muted">No data</p>
        )}
      </div>
    </Card>
  );
}

export default function AdminPlatformInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAdminAnalyticsInsights()
      .then(setData)
      .catch((e) => toast.error(e.message || 'Failed'))
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
      <Card className="p-8 text-center text-sm text-muted">Insight data unavailable.</Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Platform insights</h1>
        <p className="text-sm text-muted mt-0.5">
          Cross-tenant performance (orders, revenue ex. cancelled, tables, staff). Use for reviews—not as sole commercial or tax evidence.
        </p>
        <p className="text-xs text-muted mt-2">Tenants on platform: {data.tenants}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <RankTable
          title="Top by revenue"
          icon={Trophy}
          rows={data.top_by_revenue}
          valueKey="revenue"
          extraLabel={(r) => `${r.order_count} orders`}
        />
        <RankTable
          title="Top by order volume"
          icon={ClipboardList}
          rows={data.top_by_orders}
          valueKey="order_count"
          extraLabel={(r) => `Rs. ${Number(r.revenue).toLocaleString()} revenue`}
        />
        <RankTable
          title="Top by tables & rooms"
          icon={LayoutGrid}
          rows={data.top_by_tables}
          valueKey="table_count"
          extraLabel={(r) => `${r.staff_count} staff`}
        />
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <TrendingDown size={18} className="text-danger" />
            <h2 className="font-bold text-ink text-sm">Lowest revenue (with orders)</h2>
          </div>
          <div className="divide-y divide-border">
            {(data.lowest_by_revenue || []).map((r) => (
              <div key={r.restaurant_id} className="px-5 py-3 flex items-center justify-between gap-2">
                <Link
                  to={`/admin/restaurants/${r.restaurant_id}`}
                  className="font-semibold text-ink text-sm truncate hover:text-primary"
                >
                  {r.name}
                </Link>
                <span className="text-sm font-mono">Rs. {Number(r.revenue).toLocaleString()}</span>
              </div>
            ))}
            {(!data.lowest_by_revenue || data.lowest_by_revenue.length === 0) && (
              <p className="px-5 py-8 text-center text-sm text-muted">No qualifying venues</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={16} className="text-warning" />
          <h2 className="font-bold text-ink text-sm">Lowest order activity</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(data.lowest_by_orders || []).map((r) => (
            <Link
              key={r.restaurant_id}
              to={`/admin/restaurants/${r.restaurant_id}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-warning-soft text-warning border border-warning/20 hover:opacity-90"
            >
              {r.name} ({r.order_count})
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
