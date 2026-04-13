import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Clock, Users, PieChart } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';

const PERIODS = [
  { id: 'lifetime', label: 'Lifetime' },
  { id: 'year', label: 'This year' },
  { id: 'month', label: 'This month' },
  { id: 'week', label: 'This week' },
  { id: 'today', label: 'Today' },
];

const STATUS_META = {
  pending: { label: 'Pending', className: 'bg-warning' },
  approved: { label: 'Approved', className: 'bg-primary' },
  preparing: { label: 'Preparing', className: 'bg-primary-light' },
  ready: { label: 'Ready', className: 'bg-gold' },
  served: { label: 'Served', className: 'bg-success' },
  cancelled: { label: 'Cancelled', className: 'bg-danger' },
};

function HourBar({ value, max, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-[10px] max-w-[36px]">
      <span className="text-[10px] text-muted tabular-nums leading-none">{value}</span>
      <div className="w-full h-28 flex flex-col justify-end rounded-t-sm bg-canvas-dark/60 overflow-hidden">
        <div
          className="w-full bg-primary rounded-t-sm transition-all duration-700"
          style={{ height: `${pct}%`, minHeight: value > 0 ? 3 : 0 }}
        />
      </div>
      <span className="text-[9px] text-muted leading-none">{label}</span>
    </div>
  );
}

function RevenueDayBar({ revenue, max, label }) {
  const pct = max > 0 ? (revenue / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-[10px] text-muted tabular-nums leading-none truncate max-w-full">
        {revenue > 0 ? `Rs.${Math.round(revenue)}` : '—'}
      </span>
      <div className="w-full h-32 flex flex-col justify-end rounded-t-sm bg-canvas-dark/60 overflow-hidden">
        <div
          className="w-full bg-gold rounded-t-sm transition-all duration-700"
          style={{ height: `${pct}%`, minHeight: revenue > 0 ? 4 : 0 }}
        />
      </div>
      <span className="text-[9px] text-muted text-center leading-tight px-0.5 line-clamp-2">{label}</span>
    </div>
  );
}

function StatusMix({ rows }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const withData = rows.filter((r) => r.count > 0);

  if (!total) {
    return <p className="text-sm text-muted py-4">No orders in this period.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="h-5 w-full rounded-full overflow-hidden flex border border-border">
        {withData.map((r) => (
          <div
            key={r.status}
            title={`${STATUS_META[r.status]?.label || r.status}: ${r.count}`}
            className={`${STATUS_META[r.status]?.className || 'bg-muted'} min-w-[3px] transition-all`}
            style={{ width: `${(r.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {rows.map((r) => (
          <li key={r.status} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${STATUS_META[r.status]?.className || 'bg-muted'}`} />
            <span className="text-body truncate">{STATUS_META[r.status]?.label || r.status}</span>
            <span className="text-muted tabular-nums ml-auto">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RevenueSparkline({ points, max }) {
  if (!points.length || max <= 0) return null;
  const w = 320;
  const h = 96;
  const pad = 8;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - (p.revenue / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const line = coords.join(' ');
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 text-primary" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon fill="url(#revFill)" points={area} />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={line}
      />
    </svg>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('lifetime');
  const { restaurantId } = useAuthStore();

  useEffect(() => {
    if (!restaurantId) {
      setData(null);
      return;
    }
    setData(null);
    api
      .getRestaurantAnalytics(restaurantId, { period })
      .then(setData)
      .catch(() => setData(null));
  }, [restaurantId, period]);

  const maxHourly = data?.hourly_orders?.length
    ? Math.max(1, ...data.hourly_orders.map((d) => d.count))
    : 1;
  const topPopular = Math.max(1, data?.popular_items?.[0]?.orders || 1);

  const revenueDays = data?.revenue_by_day || [];
  const maxDailyRev = revenueDays.length ? Math.max(1, ...revenueDays.map((d) => d.revenue)) : 1;

  const statusRows = data?.orders_by_status_rows || [];

  const periodLabel = PERIODS.find((p) => p.id === period)?.label || 'Selected period';

  if (!restaurantId) {
    return (
      <div>
        <h1 className="text-2xl font-black text-ink">Analytics</h1>
        <p className="mt-3 text-sm text-muted">Link a restaurant to this account to see performance data.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink">Analytics</h1>
          <p className="text-sm text-muted mt-0.5">
            Revenue, order flow, and menu performance for the selected window. Hourly chart is always calendar today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors
                ${period === p.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-body border-border hover:border-primary/40'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data ? (
        <>
          <p className="text-xs text-muted mb-4">
            Showing <span className="font-semibold text-ink">{periodLabel}</span> for KPIs and trends · Today&apos;s hourly
            volume is local to the current calendar day
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Orders', value: data.total_orders, icon: BarChart2, color: 'bg-primary-soft text-primary' },
              {
                label: `Revenue (${periodLabel})`,
                value: `Rs. ${Number(data.total_revenue || 0).toLocaleString()}`,
                icon: TrendingUp,
                color: 'bg-gold-soft text-gold-dark',
              },
              { label: 'Avg. order', value: `Rs. ${data.avg_order_value}`, icon: Clock, color: 'bg-primary-soft text-primary' },
              { label: 'Completion rate', value: `${data.completion_rate}%`, icon: Users, color: 'bg-success-soft text-success' },
            ].map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted font-medium">{s.label}</p>
                    <p className="text-xl font-black text-ink mt-1">{s.value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                    <s.icon size={17} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <Card>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-ink text-sm">Revenue today</h2>
                  <p className="text-[11px] text-muted mt-0.5">Calendar day (UTC)</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-ink tabular-nums">
                    Rs. {Number(data.revenue_today || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted">{data.orders_today ?? 0} orders</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                  <PieChart size={16} className="text-primary" />
                  Order status mix
                </h2>
                <p className="text-[11px] text-muted mt-0.5">Share of orders in this period</p>
              </div>
              <div className="p-5">
                <StatusMix rows={statusRows} />
              </div>
            </Card>
          </div>

          {revenueDays.length > 1 && (
            <Card className="mb-6 overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-ink text-sm">Revenue trend</h2>
                <p className="text-[11px] text-muted mt-0.5">Daily net revenue (excl. cancelled) in the chart window</p>
              </div>
              <div className="p-5">
                <div className="text-primary mb-2">
                  <RevenueSparkline points={revenueDays} max={maxDailyRev} />
                </div>
                <div className="flex items-end gap-1 min-h-[140px]">
                  {revenueDays.map((d) => (
                    <RevenueDayBar key={d.date} revenue={d.revenue} max={maxDailyRev} label={d.label} />
                  ))}
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-ink text-sm">Orders by hour (today)</h2>
                <p className="text-[11px] text-muted mt-0.5">When guests are ordering right now</p>
              </div>
              <div className="p-5 overflow-x-auto">
                <div className="flex items-end gap-1 min-w-[600px]">
                  {(data.hourly_orders || []).map((d) => (
                    <HourBar key={d.hour} value={d.count} max={maxHourly} label={d.hour} />
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-ink text-sm">Top menu items ({periodLabel})</h2>
                <p className="text-[11px] text-muted mt-0.5">By quantity sold</p>
              </div>
              <div className="divide-y divide-border">
                {(data.popular_items || [])
                  .filter((x) => x.name && x.name !== '—')
                  .map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                      <span
                        className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center
                      ${i === 0 ? 'bg-gold text-ink' : 'bg-canvas-dark text-body'}`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-ink flex-1 min-w-0 truncate">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-canvas-dark rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(item.orders / topPopular) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted w-12 text-right tabular-nums">{item.orders}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-muted">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Loading analytics…</p>
        </div>
      )}
    </div>
  );
}
