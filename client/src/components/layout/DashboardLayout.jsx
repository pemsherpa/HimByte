import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, ChefHat, Package,
  BarChart3, Menu, X, Bell, LogOut, Building2, QrCode
} from 'lucide-react';

const merchantNav = [
  { to: '/merchant',           icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/merchant/orders',    icon: ClipboardList,   label: 'Order Gate'  },
  { to: '/merchant/kitchen',   icon: ChefHat,         label: 'Kitchen KDS' },
  { to: '/merchant/inventory', icon: Package,         label: 'Inventory'   },
  { to: '/merchant/analytics', icon: BarChart3,       label: 'Analytics'   },
  { to: '/merchant/qrcodes',   icon: QrCode,          label: 'QR Codes'    },
];

const adminNav = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/admin/restaurants',  icon: Building2,       label: 'Restaurants'  },
  { to: '/admin/analytics',    icon: BarChart3,       label: 'Analytics'    },
];

function SidebarContent({ nav, title, onClose }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-ink font-black text-base">H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Himbyte</p>
            <p className="text-white/40 text-[10px]">{title}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${isActive
                ? 'bg-gold text-ink font-bold shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/8'}`
            }>
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button className="flex items-center gap-2 text-white/40 hover:text-white text-sm px-3 py-2 w-full transition-colors rounded-xl hover:bg-white/5">
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ variant = 'merchant' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav   = variant === 'admin' ? adminNav : merchantNav;
  const title = variant === 'admin' ? 'Super Admin' : 'Merchant';

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar bg-dhaka">
        <SidebarContent nav={nav} title={title} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed inset-y-0 left-0 w-60 bg-sidebar bg-dhaka z-50 lg:hidden flex flex-col">
              <SidebarContent nav={nav} title={title} onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="lg:pl-60 flex-1 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 glass border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-canvas-dark">
              <Menu size={20} className="text-ink" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button className="relative p-2 hover:bg-canvas-dark rounded-xl transition-colors">
                <Bell size={18} className="text-muted" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold rounded-full" />
              </button>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold text-xs">S</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
