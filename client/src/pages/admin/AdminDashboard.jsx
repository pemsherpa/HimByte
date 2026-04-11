import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Receipt, TrendingUp, Users, CheckCircle, BarChart2 } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

function StatCard({ label, value, sub, icon: Icon, color, delay = 0 }) {
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

function HourlyChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <Card>
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-bold text-ink text-sm flex items-center gap-2">
          <BarChart2 size={16} className="text-primary" /> Orders by Hour (Today)
        </h2>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-1.5 h-28">
          {data.map((d) => (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary rounded-t-sm transition-all duration-500"
                style={{ height: `${max > 0 ? (d.count / max) * 100 : 0}%`, minHeight: d.count > 0 ? 4 : 0 }}
              />
              <span className="text-[9px] text-muted">{d.hour}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const [analytics, setAnalytics]       = useState(null);
  const [restaurants, setRestaurants]   = useState([]);

  useEffect(() => {
    api.getGlobalAnalytics().then(setAnalytics).catch(() => {});
    api.getAllRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Himbyte HQ</h1>
        <p className="text-sm text-muted mt-0.5">Platform-wide overview across all tenants.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Restaurants"     value={analytics?.total_restaurants ?? '—'} icon={Building2}    color="bg-primary-soft text-primary"    delay={0.00} />
        <StatCard label="Orders Today"    value={analytics?.orders_today ?? '—'}      icon={Receipt}      color="bg-gold-soft text-gold-dark"     delay={0.07} />
        <StatCard label="Revenue Today"   value={analytics ? `Rs. ${analytics.revenue_today.toLocaleString()}` : '—'} sub="Across all restaurants"
          icon={TrendingUp}   color="bg-success-soft text-success"   delay={0.14} />
        <StatCard label="Completion Rate" value={analytics ? `${analytics.completion_rate}%` : '—'} sub={`${analytics?.total_orders ?? 0} total orders`}
          icon={CheckCircle}  color="bg-blue-50 text-blue-600"       delay={0.21} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Hourly chart */}
        {analytics?.hourly_orders && <HourlyChart data={analytics.hourly_orders} />}

        {/* Popular items */}
        {analytics?.popular_items && (
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" /> Popular Items
              </h2>
            </div>
            <div className="divide-y divide-border">
              {analytics.popular_items.map((item, i) => (
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

      {/* Restaurants table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          <h2 className="font-bold text-ink text-sm">Active Tenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-canvas text-left text-xs text-muted uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Restaurant</th>
                <th className="px-5 py-3 font-semibold">Address</th>
                <th className="px-5 py-3 font-semibold">VAT/PAN</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Orders Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {restaurants.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{r.name}</p>
                        <p className="text-xs text-muted">/{r.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-body">{r.address || '—'}</td>
                  <td className="px-5 py-3">
                    {r.vat_pan_number
                      ? <span className="text-xs font-mono text-ink bg-canvas px-2 py-0.5 rounded">{r.vat_pan_number}</span>
                      : <span className="text-xs text-muted">Not registered</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge status={r.is_active ? 'active' : 'cancelled'} />
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-ink">{r.order_count_today ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {restaurants.length === 0 && (
            <div className="text-center py-10 text-muted text-sm">No restaurants yet</div>
          )}
        </div>
      </Card>
    </div>
  );
}
