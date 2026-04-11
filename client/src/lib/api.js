const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('himbyte_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // ── Restaurant ──────────────────────────────
  getRestaurant: (slug) => request(`/restaurants/${slug}`),
  getTablesRooms: (restaurantId, type) =>
    request(`/restaurants/${restaurantId}/tables_rooms${type ? `?type=${type}` : ''}`),

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

  // ── Service Requests ────────────────────────
  createServiceRequest: (payload) =>
    request('/service-requests', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Admin ───────────────────────────────────
  getAllRestaurants: () => request('/admin/restaurants'),
  getGlobalAnalytics: () => request('/admin/analytics'),
  toggleItemAvailability: (id) => request(`/admin/menu-items/${id}/toggle`, { method: 'PATCH' }),
  getAllMenuItems: (restaurantId) => request(`/admin/menu-items/${restaurantId}`),
};
