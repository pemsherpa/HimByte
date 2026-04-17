import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import useAuthStore from './stores/authStore';
import { DEMO_MODE } from './lib/supabase';

import HomePage      from './pages/HomePage';
import PricingPage   from './pages/PricingPage';
import ContactPage   from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import TryMenuPage from './pages/TryMenuPage';
import LoginPage     from './pages/LoginPage';
import RegisterPage  from './pages/RegisterPage';
import QRLanding     from './pages/customer/QRLanding';
import MenuPage      from './pages/customer/MenuPage';
import ServicesPage  from './pages/customer/ServicesPage';
import BillPage        from './pages/customer/BillPage';
import { GuestEsewaSuccessPage, GuestEsewaFailurePage } from './pages/customer/GuestEsewaReturn.jsx';

import DashboardLayout    from './components/layout/DashboardLayout';
import MerchantDashboard  from './pages/merchant/MerchantDashboard';
import OrderGate          from './pages/merchant/OrderGate';
import KitchenKDS         from './pages/merchant/KitchenKDS';
import Inventory          from './pages/merchant/Inventory';
import Analytics          from './pages/merchant/Analytics';
import QRCodes            from './pages/merchant/QRCodes';
import TableBills         from './pages/merchant/TableBills';
import MerchantReceipts   from './pages/merchant/MerchantReceipts';
import GuestRequests      from './pages/merchant/GuestRequests';
import VendorDueReport    from './pages/merchant/VendorDueReport';
import HRWorkspace        from './pages/merchant/HRWorkspace';
import { EsewaSuccessPage, EsewaFailurePage } from './pages/merchant/EsewaPaymentReturn.jsx';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminAnalytics from './pages/admin/AdminAnalytics';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen bg-canvas flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

function OwnerOnly({ children }) {
  const { profile, loading } = useAuthStore();
  if (loading) return null;
  if (profile?.role !== 'restaurant_admin' && profile?.role !== 'super_admin') {
    return <Navigate to="/merchant/orders" replace />;
  }
  return children;
}

function SuperAdminOnly({ children }) {
  const { profile, loading } = useAuthStore();
  if (loading) return null;
  if (profile?.role !== 'super_admin') return <Navigate to="/merchant" replace />;
  return children;
}

function MerchantIndex() {
  const { profile } = useAuthStore();
  if (profile?.role === 'staff') {
    return <Navigate to="/merchant/orders" replace />;
  }
  return <MerchantDashboard />;
}

function PostLoginRedirect() {
  const { profile, loading } = useAuthStore();
  if (loading) return null;
  if (profile?.role === 'super_admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'staff') return <Navigate to="/merchant/orders" replace />;
  return <Navigate to="/merchant" replace />;
}

export default function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

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
        <Route path="/"       element={<HomePage />} />
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/try-menu" element={<TryMenuPage />} />
        <Route path="/scan"   element={<QRLanding />} />
        <Route path="/menu/:slug"   element={<MenuPage />} />
        <Route path="/menu"   element={<MenuPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/bill" element={<BillPage />} />
        <Route path="/bill/payments/esewa/success" element={<GuestEsewaSuccessPage />} />
        <Route path="/bill/payments/esewa/failure" element={<GuestEsewaFailurePage />} />

        {/* Post-login redirect */}
        <Route path="/dashboard" element={
          <ProtectedRoute><PostLoginRedirect /></ProtectedRoute>
        } />

        {/* Merchant hub (owner + staff share layout, routes gated per role) */}
        <Route path="/merchant" element={
          <ProtectedRoute>
            <DashboardLayout variant="merchant" />
          </ProtectedRoute>
        }>
          <Route index              element={<MerchantIndex />} />
          <Route path="orders"      element={<OrderGate />} />
          <Route path="kitchen"     element={<KitchenKDS />} />
          <Route path="inventory"   element={<Inventory />} />
          <Route path="bills"       element={<TableBills />} />
          <Route path="guest-requests" element={<GuestRequests />} />
          <Route path="receipts"    element={<MerchantReceipts />} />
          <Route path="analytics"   element={<OwnerOnly><Analytics /></OwnerOnly>} />
          <Route path="tables"      element={<OwnerOnly><QRCodes /></OwnerOnly>} />
          <Route path="qrcodes"     element={<Navigate to="/merchant/tables" replace />} />
          <Route path="vendor-due"  element={<OwnerOnly><VendorDueReport /></OwnerOnly>} />
          <Route path="hr"          element={<OwnerOnly><HRWorkspace /></OwnerOnly>} />
          <Route path="payments/esewa/success" element={<EsewaSuccessPage />} />
          <Route path="payments/esewa/failure" element={<EsewaFailurePage />} />
        </Route>

        {/* Super Admin (protected + role-restricted) */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <SuperAdminOnly>
              <DashboardLayout variant="admin" />
            </SuperAdminOnly>
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="restaurants" element={<AdminRestaurants />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
