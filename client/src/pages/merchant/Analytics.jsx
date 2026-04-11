import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Clock, Users } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';

function Bar({ value, max, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-end gap-1.5">
      <div className="flex flex-col items-center gap-1 flex-1">
        <span className="text-[10px] text-muted">{value}</span>
        <div className="w-full bg-primary rounded-t-sm transition-all duration-700" style={{ height: `${pct}%`, minHeight: value > 0 ? 4 : 0 }} />
        <span className="text-[9px] text-muted">{label}</span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getGlobalAnalytics().then(setData).catch(() => {});
  }, []);

  const maxHourly = data?.hourly_orders ? Math.max(...data.hourly_orders.map((d) => d.count)) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Analytics</h1>
        <p className="text-sm text-muted mt-0.5">Performance overview for today.</p>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Orders',    value: data.total_orders,                              icon: BarChart2, color: 'bg-primary-soft text-primary' },
              { label: 'Revenue (Total)', value: `Rs. ${data.total_revenue.toLocaleString()}`,   icon: TrendingUp,color: 'bg-gold-soft text-gold-dark' },
              { label: 'Avg. Order',      value: `Rs. ${data.avg_order_value}`,                  icon: Clock,     color: 'bg-blue-50 text-blue-600' },
              { label: 'Completion Rate', value: `${data.completion_rate}%`,                      icon: Users,     color: 'bg-success-soft text-success' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-ink text-sm">Orders by Hour</h2>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-1 h-32">
                  {data.hourly_orders.map((d) => (
                    <Bar key={d.hour} value={d.count} max={maxHourly} label={d.hour} />
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-ink text-sm">Top Menu Items</h2>
              </div>
              <div className="divide-y divide-border">
                {data.popular_items.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center
                      ${i === 0 ? 'bg-gold text-ink' : 'bg-canvas-dark text-body'}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-ink flex-1">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-canvas-dark rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full"
                          style={{ width: `${(item.orders / data.popular_items[0].orders) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted w-12 text-right">{item.orders} orders</span>
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
