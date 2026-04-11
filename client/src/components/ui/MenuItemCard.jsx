import { motion } from 'framer-motion';
import { Plus, Minus, ImageOff } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';

export default function MenuItemCard({ item }) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find((i) => i.menu_item_id === item.id);
  const qty = cartItem?.quantity || 0;

  return (
    <div className="flex gap-3 bg-surface rounded-2xl border border-border p-3 overflow-hidden">
      {/* Image / placeholder */}
      <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-canvas-dark flex items-center justify-center">
        {item.image_url
          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          : <ImageOff size={22} className="text-muted" />
        }
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-semibold text-ink text-sm leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-black text-primary">Rs. {item.price}</span>

          {qty === 0 ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => addItem(item)}
              className="bg-primary text-white px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors"
            >
              ADD
            </motion.button>
          ) : (
            <div className="flex items-center gap-1.5 bg-primary-soft rounded-xl px-1 py-0.5">
              <motion.button whileTap={{ scale: 0.85 }}
                onClick={() => updateQuantity(item.id, qty - 1)}
                className="w-7 h-7 rounded-lg text-primary flex items-center justify-center hover:bg-primary/10 transition-colors">
                <Minus size={14} />
              </motion.button>
              <span className="text-sm font-black text-primary w-4 text-center">{qty}</span>
              <motion.button whileTap={{ scale: 0.85 }}
                onClick={() => addItem(item)}
                className="w-7 h-7 rounded-lg text-primary flex items-center justify-center hover:bg-primary/10 transition-colors">
                <Plus size={14} />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
