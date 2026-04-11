import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../../lib/api';
import { DEMO_RESTAURANT_ID } from '../../lib/constants';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [items, setItems]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllMenuItems(DEMO_RESTAURANT_ID).then(setItems).finally(() => setLoading(false));
  }, []);

  async function handleToggle(id) {
    try {
      const updated = await api.toggleItemAvailability(id);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_available: updated.is_available } : i)));
      toast.success(updated.is_available ? 'Item is now available' : 'Item marked out of stock');
    } catch { toast.error('Failed to update item'); }
  }

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  const available   = filtered.filter((i) => i.is_available);
  const unavailable = filtered.filter((i) => !i.is_available);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Inventory</h1>
        <p className="text-sm text-muted mt-0.5">Toggle item availability in real-time.</p>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" placeholder="Search items…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Summary */}
      <div className="flex gap-3 mb-5">
        <div className="bg-success-soft text-success text-xs font-bold px-3 py-1.5 rounded-full">
          {available.length} Available
        </div>
        <div className="bg-danger-soft text-danger text-xs font-bold px-3 py-1.5 rounded-full">
          {unavailable.length} Out of Stock
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <div className={`flex items-center gap-4 bg-surface border rounded-xl px-4 py-3.5 transition-opacity
              ${!item.is_available ? 'opacity-55 border-dashed' : 'border-border'}`}>
              <div className="w-10 h-10 bg-canvas rounded-xl flex items-center justify-center flex-shrink-0">
                {item.image_url
                  ? <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                  : <Package size={18} className="text-muted" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink truncate">{item.name}</h3>
                <p className="text-sm font-bold text-primary">Rs. {item.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${item.is_available ? 'text-success' : 'text-danger'}`}>
                  {item.is_available ? 'In Stock' : 'Out of Stock'}
                </span>
                <button onClick={() => handleToggle(item.id)} className="flex-shrink-0">
                  {item.is_available
                    ? <ToggleRight size={32} className="text-success" />
                    : <ToggleLeft  size={32} className="text-muted" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted">
          <Package size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No items found</p>
        </div>
      )}
    </div>
  );
}
