import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, ChefHat, Package,
  BarChart3, Menu, X, LogOut, Building2, QrCode, Receipt, FileSpreadsheet, Bell, Truck, Users,
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { DEMO_MODE } from '../../lib/supabase';

const ownerNav = [
  { to: '/merchant',           icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/merchant/orders',    icon: ClipboardList,   label: 'Order Gate'  },
  { to: '/merchant/kitchen',   icon: ChefHat,         label: 'Kitchen KDS' },
  { to: '/merchant/bills',     icon: Receipt,         label: 'Table Bills' },
  { to: '/merchant/guest-requests', icon: Bell,      label: 'Guest requests' },
  { to: '/merchant/receipts',  icon: FileSpreadsheet, label: 'Receipts & VAT' },
  { to: '/merchant/inventory', icon: Package,         label: 'Menu & stock' },
  { to: '/merchant/analytics', icon: BarChart3,       label: 'Analytics'   },
  { to: '/merchant/vendor-due', icon: Truck,          label: 'Vendor due'  },
  { to: '/merchant/hr',        icon: Users,           label: 'HR & team'   },
  { to: '/merchant/tables',    icon: QrCode,          label: 'Tables & rooms' },
];

const staffNav = [
  { to: '/merchant/orders',    icon: ClipboardList,   label: 'Order Gate', end: true },
  { to: '/merchant/kitchen',   icon: ChefHat,         label: 'Kitchen KDS' },
  { to: '/merchant/bills',     icon: Receipt,         label: 'Table Bills' },
  { to: '/merchant/guest-requests', icon: Bell,      label: 'Guest requests' },
  { to: '/merchant/receipts',  icon: FileSpreadsheet, label: 'Receipts & VAT' },
  { to: '/merchant/inventory', icon: Package,         label: 'Menu & stock' },
];

const adminNav = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/admin/restaurants',  icon: Building2,       label: 'Restaurants'  },
  { to: '/admin/analytics',    icon: BarChart3,       label: 'Analytics'    },
];

function SidebarContent({ nav, title, onClose, profile, onSignOut }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-9 h-9 rounded-xl object-cover shadow-lg" />
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

      <div className="p-4 border-t border-white/10">
        {!DEMO_MODE && profile && (
          <div className="px-3 py-2 mb-2">
            <p className="text-white/80 text-xs font-semibold truncate">{profile.full_name}</p>
            <p className="text-white/30 text-[10px] capitalize">{profile.role?.replace('_', ' ')}</p>
          </div>
        )}
        <button type="button" onClick={onSignOut} className="flex items-center gap-2 text-white/40 hover:text-white text-sm px-3 py-2 w-full transition-colors rounded-xl hover:bg-white/5">
          <LogOut size={15} />
          {DEMO_MODE ? 'Exit Demo' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ variant = 'merchant' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  let nav, title;
  if (variant === 'admin') {
    nav = adminNav;
    title = 'Super Admin';
  } else if (profile?.role === 'restaurant_admin') {
    nav = ownerNav;
    title = 'Owner';
  } else {
    nav = staffNav;
    title = 'Staff';
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = DEMO_MODE ? '/' : '/login';
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar bg-dhaka">
        <SidebarContent nav={nav} title={title} profile={profile} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden" />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="fixed inset-y-0 left-0 w-60 bg-sidebar bg-dhaka z-50 flex flex-col lg:hidden">
              <SidebarContent nav={nav} title={title} onClose={() => setSidebarOpen(false)} profile={profile} onSignOut={handleSignOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-30 bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-ink">
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-ink">Himbyte</span>
        </header>

        <main className="flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
