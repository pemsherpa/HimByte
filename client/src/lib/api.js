const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('himbyte_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) {
    if (!res.ok) throw new Error('Request failed');
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function publicPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function publicGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // ── Session (staff) ───────────────────────────
  getMe: () => request('/me'),

  // ── Onboarding (public) ───────────────────────
  registerRestaurantOwner: (body) => publicPost('/onboarding/register-owner', body),

  // ── Restaurant ──────────────────────────────
  getRestaurant: (slug) => request(`/restaurants/${slug}`),
  getRestaurantById: (id) => request(`/restaurants/by-id/${id}`),
  getTablesRooms: (restaurantId, type) =>
    request(`/restaurants/${restaurantId}/tables_rooms${type ? `?type=${type}` : ''}`),
  deleteTableRoom: (restaurantId, tableRoomId) =>
    request(`/restaurants/${restaurantId}/tables_rooms/${tableRoomId}`, { method: 'DELETE' }),

  // ── Menu ────────────────────────────────────
  getCategories: (restaurantId, { serviceOnly } = {}) =>
    request(`/menu/${restaurantId}/categories${serviceOnly !== undefined ? `?service=${serviceOnly}` : ''}`),
  getMenuItems: (restaurantId, categoryId) =>
    request(`/menu/${restaurantId}/items${categoryId ? `?category_id=${categoryId}` : ''}`),

  // ── Orders (guest) ──────────────────────────
  placeOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  trackOrders: (sessionId) => request(`/orders/track/${sessionId}`),

  // ── Orders (staff) ──────────────────────────
  getRestaurantOrders: (restaurantId, status) =>
    request(`/orders/restaurant/${restaurantId}${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (orderId, status) =>
    request(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ── Service Requests (guest — no auth header; avoids staff token shadowing session) ──
  createServiceRequest: (payload) => publicPost('/service-requests', payload),
  getServiceRequests: (restaurantId, status) =>
    request(`/service-requests/restaurant/${restaurantId}${status ? `?status=${status}` : ''}`),
  updateServiceRequestStatus: (id, status) =>
    request(`/service-requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ── Table Bills ─────────────────────────────
  getTableBills: (restaurantId) => request(`/tables/${restaurantId}/bills`),
  getTableBill: (tableRoomId) => request(`/tables/${tableRoomId}/bill`),
  settleTable: (tableRoomId) => request(`/tables/${tableRoomId}/settle`, { method: 'POST' }),
  transferOrders: (fromTableId, payload) =>
    request(`/tables/${fromTableId}/transfer`, { method: 'POST', body: JSON.stringify(payload) }),
  splitBill: (tableRoomId, payload) =>
    request(`/tables/${tableRoomId}/split`, { method: 'POST', body: JSON.stringify(payload) }),

  // ── eSewa ePay v2 (pay at counter) ─────────
  getEsewaConfig: () => request('/payments/esewa/config'),
  initEsewaTableBill: (tableRoomId) =>
    request('/payments/esewa/table-bill/init', {
      method: 'POST',
      body: JSON.stringify({ table_room_id: tableRoomId }),
    }),
  verifyEsewaPayment: (data) =>
    request('/payments/esewa/verify', { method: 'POST', body: JSON.stringify({ data }) }),
  getEsewaPublicConfig: () => publicGet('/payments/esewa/public-config'),
  initEsewaGuestBill: (body) => publicPost('/payments/esewa/guest/init', body),
  verifyEsewaGuestPayment: (data) => publicPost('/payments/esewa/guest/verify', { data }),

  // ── Menu Item Update ──────────────────────
  updateMenuItem: (id, body) =>
    request(`/admin/menu-items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Admin ───────────────────────────────────
  getAllRestaurants: () => request('/admin/restaurants'),
  getGlobalAnalytics: () => request('/admin/analytics'),
  deleteRestaurant: (restaurantId) => request(`/admin/restaurants/${restaurantId}`, { method: 'DELETE' }),
  getRestaurantAnalytics: (restaurantId, { period } = {}) =>
    request(
      `/admin/restaurant-analytics/${restaurantId}${period ? `?period=${encodeURIComponent(period)}` : ''}`,
    ),
  toggleItemAvailability: (id) => request(`/admin/menu-items/${id}/toggle`, { method: 'PATCH' }),
  getAllMenuItems: (restaurantId) => request(`/admin/menu-items/${restaurantId}`),
  createMenuItem: (body) => request('/admin/menu-items', { method: 'POST', body: JSON.stringify(body) }),
  /** Server uploads to Storage with service role (avoids client Storage RLS issues). */
  uploadMenuImage: (body) =>
    request('/admin/menu-images/upload', { method: 'POST', body: JSON.stringify(body) }),
  createCategory: (body) => request('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  deleteMenuItem: (id) => request(`/admin/menu-items/${id}`, { method: 'DELETE' }),
  createTableRoom: (restaurantId, body) =>
    request(`/restaurants/${restaurantId}/tables_rooms`, { method: 'POST', body: JSON.stringify(body) }),

  // ── Receipts (guest snapshot + staff history) ─────────────────
  /** Persists a VAT receipt for this browser session (no auth). */
  createReceiptFromSession: (body) => publicPost('/receipts/from-session', body),
  listReceipts: (restaurantId) => request(`/receipts/restaurant/${restaurantId}`),
  exportReceiptsCsv: async (restaurantId) => {
    const token = localStorage.getItem('himbyte_token');
    const res = await fetch(`${API_BASE}/receipts/restaurant/${restaurantId}/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let msg = 'Export failed';
      try {
        const j = await res.json();
        msg = j.error || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return res.blob();
  },

  // ── Super Admin: subscription ─────────────────────────────────
  updateRestaurantSubscription: (restaurantId, body) =>
    request(`/admin/restaurants/${restaurantId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ── Owner: vendors & payables ─────────────────────────────────
  listVendors: (restaurantId) => request(`/owner/${restaurantId}/vendors`),
  createVendor: (restaurantId, body) =>
    request(`/owner/${restaurantId}/vendors`, { method: 'POST', body: JSON.stringify(body) }),
  updateVendor: (restaurantId, id, body) =>
    request(`/owner/${restaurantId}/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listVendorPayables: (restaurantId) => request(`/owner/${restaurantId}/vendor-payables`),
  createVendorPayable: (restaurantId, body) =>
    request(`/owner/${restaurantId}/vendor-payables`, { method: 'POST', body: JSON.stringify(body) }),
  updateVendorPayable: (restaurantId, id, body) =>
    request(`/owner/${restaurantId}/vendor-payables/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Owner: HR ───────────────────────────────────────────────
  listEmployees: (restaurantId) => request(`/owner/${restaurantId}/employees`),
  createEmployee: (restaurantId, body) =>
    request(`/owner/${restaurantId}/employees`, { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (restaurantId, id, body) =>
    request(`/owner/${restaurantId}/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listEmploymentHistory: (restaurantId, employeeId) =>
    request(`/owner/${restaurantId}/employees/${employeeId}/employment-history`),
  createEmploymentHistory: (restaurantId, body) =>
    request(`/owner/${restaurantId}/employment-history`, { method: 'POST', body: JSON.stringify(body) }),
  deleteEmployee: (restaurantId, id) =>
    request(`/owner/${restaurantId}/employees/${id}`, { method: 'DELETE' }),

  listEmployeeShifts: (restaurantId, employeeId) =>
    request(`/owner/${restaurantId}/employees/${employeeId}/shifts`),
  createEmployeeShift: (restaurantId, employeeId, body) =>
    request(`/owner/${restaurantId}/employees/${employeeId}/shifts`, { method: 'POST', body: JSON.stringify(body) }),
  updateEmployeeShift: (restaurantId, shiftId, body) =>
    request(`/owner/${restaurantId}/employee-shifts/${shiftId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteEmployeeShift: (restaurantId, shiftId) =>
    request(`/owner/${restaurantId}/employee-shifts/${shiftId}`, { method: 'DELETE' }),
};
