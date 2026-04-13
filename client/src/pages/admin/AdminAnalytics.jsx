import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Receipt, Building2, CheckCircle, DollarSign, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';

function Stat({ label, value, sub, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted font-medium">{label}</p>
            <p className="text-2xl font-black text-ink mt-1">{value}</p>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={19} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGlobalAnalytics()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!data) return (
    <Card className="p-10 text-center">
      <p className="text-sm text-muted">Failed to load analytics.</p>
    </Card>
  );

  const maxH = Math.max(...(data.hourly_orders || []).map((d) => d.count), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Platform Analytics</h1>
        <p className="text-sm text-muted mt-0.5">Global metrics across all restaurants.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Stat label="Total Restaurants" value={data.total_restaurants} icon={Building2} color="bg-primary-soft text-primary" delay={0} />
        <Stat label="Total Orders" value={data.total_orders} icon={Receipt} color="bg-gold-soft text-gold-dark" delay={0.07} />
        <Stat label="Orders Today" value={data.orders_today} icon={Receipt} color="bg-success-soft text-success" delay={0.14} />
        <Stat label="Total Revenue" value={`Rs. ${Number(data.total_revenue).toLocaleString()}`} icon={DollarSign} color="bg-primary-soft text-primary" delay={0.21} />
        <Stat label="Revenue Today" value={`Rs. ${Number(data.revenue_today).toLocaleString()}`} icon={TrendingUp} color="bg-success-soft text-success" delay={0.28} />
        <Stat label="Completion Rate" value={`${data.completion_rate}%`} sub={`${data.total_orders} total orders`} icon={CheckCircle} color="bg-blue-50 text-blue-600" delay={0.35} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.hourly_orders?.length > 0 && (
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                <BarChart2 size={16} className="text-primary" /> Orders by Hour (Today)
              </h2>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-1.5 h-28">
                {data.hourly_orders.map((d) => (
                  <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary rounded-t-sm transition-all duration-500"
                      style={{ height: `${maxH > 0 ? (d.count / maxH) * 100 : 0}%`, minHeight: d.count > 0 ? 4 : 0 }}
                    />
                    <span className="text-[9px] text-muted">{d.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {data.popular_items?.length > 0 && (
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" /> Popular Items (All Time)
              </h2>
            </div>
            <div className="divide-y divide-border">
              {data.popular_items.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black
                    ${i === 0 ? 'bg-gold text-ink' : i === 1 ? 'bg-canvas-dark text-body' : 'bg-canvas text-muted'}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-ink flex-1">{item.name}</span>
                  <span className="text-xs text-muted font-medium">{item.orders} orders</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
