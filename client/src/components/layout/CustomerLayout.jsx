import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import MandalaBackground from '../patterns/MandalaBackground';

export default function CustomerLayout({ children, restaurantName, onCartClick }) {
  const itemCount = useCartStore((s) => s.getItemCount());

  return (
    <div className="min-h-screen bg-canvas relative">
      <MandalaBackground opacity={0.05} />

      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">H</span>
            </div>
            <div>
              <h1 className="font-bold text-ink text-sm leading-tight">{restaurantName || 'Himbyte'}</h1>
              <p className="text-[10px] text-muted">Digital Menu</p>
            </div>
          </div>

          {onCartClick && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={onCartClick}
              className="relative p-2.5 bg-primary-soft rounded-xl hover:bg-primary/20 transition-colors">
              <ShoppingBag size={20} className="text-primary" />
              {itemCount > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-ink text-[10px] font-black rounded-full flex items-center justify-center">
                  {itemCount}
                </motion.span>
              )}
            </motion.button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto relative z-10">{children}</main>
    </div>
  );
}
