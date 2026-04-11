import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import HomePage      from './pages/HomePage';
import QRLanding     from './pages/customer/QRLanding';
import MenuPage      from './pages/customer/MenuPage';
import ServicesPage  from './pages/customer/ServicesPage';

import DashboardLayout    from './components/layout/DashboardLayout';
import MerchantDashboard  from './pages/merchant/MerchantDashboard';
import OrderGate          from './pages/merchant/OrderGate';
import KitchenKDS         from './pages/merchant/KitchenKDS';
import Inventory          from './pages/merchant/Inventory';
import Analytics          from './pages/merchant/Analytics';
import QRCodes            from './pages/merchant/QRCodes';

import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '14px',
            background: '#0D2540',
            color: '#F4F8FB',
            fontWeight: 600,
            fontSize: '13px',
            padding: '10px 16px',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/"        element={<HomePage />} />
        <Route path="/scan"    element={<QRLanding />} />
        <Route path="/menu"    element={<MenuPage />} />
        <Route path="/services" element={<ServicesPage />} />

        {/* Merchant dashboard */}
        <Route path="/merchant" element={<DashboardLayout variant="merchant" />}>
          <Route index              element={<MerchantDashboard />} />
          <Route path="orders"      element={<OrderGate />} />
          <Route path="kitchen"     element={<KitchenKDS />} />
          <Route path="inventory"   element={<Inventory />} />
          <Route path="analytics"   element={<Analytics />} />
          <Route path="qrcodes"     element={<QRCodes />} />
        </Route>

        {/* Super Admin */}
        <Route path="/admin" element={<DashboardLayout variant="admin" />}>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
